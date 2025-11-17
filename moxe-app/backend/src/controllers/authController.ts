import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import jwt from 'jsonwebtoken'
import twilio from 'twilio'
import bcrypt from 'bcryptjs'

// Store OTPs temporarily (in production, use Redis)
const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map()

// Lazy initialize Twilio client (only when needed and if credentials exist)
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (!accountSid || !authToken) {
    return null
  }
  
  try {
    return twilio(accountSid, authToken)
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error)
    return null
  }
}

export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' })
    }

    // Validate phone number format (allow + and digits)
    // Don't strip + as it's needed for Twilio
    const cleanedPhone = phone.replace(/[^\d+]/g, '')
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({ message: 'Invalid phone number format' })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store OTP
    otpStore.set(phone, { otp, expiresAt })

    // Format phone number for Twilio (ensure it starts with +)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`

    // Try to send via Twilio, but always succeed in development mode
    let smsSent = false
    const twilioClient = getTwilioClient()
    
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        // Send OTP via Twilio SMS
        await twilioClient.messages.create({
          body: `Your MOxE verification code is: ${otp}. This code will expire in 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        })

        smsSent = true
        console.log(`✅ OTP sent via SMS to ${formattedPhone}`)
      } catch (twilioError: any) {
        console.error('❌ Twilio SMS error:', twilioError.message)
        console.error('   Error code:', twilioError.code)
        console.error('   More info:', twilioError.moreInfo)
        smsSent = false
      }
    } else {
      console.warn('⚠️  Twilio not configured - SMS will not be sent')
      console.log(`📱 OTP for ${formattedPhone}: ${otp}`)
      smsSent = false
    }

    // Always return success in development mode, with OTP included
    if (process.env.NODE_ENV === 'development') {
      res.json({ 
        message: smsSent 
          ? 'OTP sent successfully to your phone number' 
          : 'OTP generated (SMS unavailable - check console for code)',
        otp: otp // Always include OTP in development
      })
    } else {
      // Production mode
      if (smsSent) {
        res.json({ 
          message: 'OTP sent successfully to your phone number'
        })
      } else {
        // In production, we might want to be stricter
        // But for now, we'll still allow it with a warning
        res.json({ 
          message: 'OTP generated. Please check your phone for the code.',
          // Don't send OTP in production response
        })
      }
    }
  } catch (error: any) {
    console.error('Request OTP error:', error)
    res.status(500).json({ message: error.message })
  }
}

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' })
    }

    const stored = otpStore.get(phone)

    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or invalid' })
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    // OTP verified - clear it
    otpStore.delete(phone)

    res.json({ message: 'OTP verified successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const register = async (req: Request, res: Response) => {
  try {
    const { phone, otp, name, accountType, email } = req.body

    // Verify OTP first
    const stored = otpStore.get(phone)
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' })
    }

    // Validate account type
    const validAccountTypes = ['personal', 'business', 'creator']
    if (!accountType || !validAccountTypes.includes(accountType)) {
      return res.status(400).json({ message: 'Invalid account type. Must be personal, business, or creator' })
    }

    // Check account limits per phone number (max 2 accounts)
    const existingAccounts = await User.find({ phone })
    const accountCount = existingAccounts.length

    if (accountCount >= 2) {
      return res.status(400).json({ 
        message: 'Maximum account limit reached. You can only create 2 accounts per phone number.',
        existingAccounts: existingAccounts.map(acc => ({
          accountType: acc.accountType,
          username: acc.profile?.username,
        }))
      })
    }

    // Optional: prevent duplicate account type for the same phone
    const existingAccountType = existingAccounts.find(acc => acc.accountType === accountType)
    if (existingAccountType) {
      return res.status(400).json({ 
        message: `You already have a ${accountType} account with this phone number.`,
        suggestion: accountCount < 2 
          ? `You can create ${2 - accountCount} more account(s) with a different type.`
          : 'You have reached the maximum account limit.'
      })
    }

    // Validate account type restrictions
    // Business accounts must be public
    if (accountType === 'business') {
      // Business accounts are always public
    }

    // Calculate accounts remaining (out of 2)
    const accountsRemaining = 2 - accountCount - 1

    // Generate unique username
    const baseUsername = name?.toLowerCase().replace(/\s+/g, '_') || 'user'
    let username = `${baseUsername}_${Date.now()}`
    let usernameExists = await User.findOne({ 'profile.username': username })
    let counter = 1
    while (usernameExists) {
      username = `${baseUsername}_${Date.now()}_${counter}`
      usernameExists = await User.findOne({ 'profile.username': username })
      counter++
    }

    // Create user (ensure username field also stored at root and in profile)
    const user = new User({
      phone,
      email: accountType !== 'personal' ? email : undefined, // Email optional for business/creator
      accountType,
      accountsRemaining,
      username,
      profile: {
        fullName: name,
        username,
        isPrivate: accountType === 'business' ? false : true, // Business must be public
      },
      subscription: {
        tier: 'basic',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days
      },
    })

    await user.save()

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    })

    otpStore.delete(phone)

    res.json({
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        accountType: user.accountType,
        profile: user.profile,
        subscription: user.subscription,
        accountsRemaining: user.accountsRemaining,
      },
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    res.status(500).json({ message: error.message || 'Registration failed' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body

    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    })

    // Update last active
    user.lastActive = new Date()
    await user.save()

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        accountType: user.accountType,
        profile: user.profile,
        subscription: user.subscription,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const createPassword = async (req: Request, res: Response) => {
  try {
    const { phone, password, username, name, email, accountType } = req.body

    if (!phone || !password || !username || !name || !accountType) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' })
    }

    // Validate username format
    if (!/^(?=.{3,30}$)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]+$/.test(username)) {
      return res.status(400).json({ message: 'Invalid username format' })
    }

    // Check if username already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        { 'profile.username': username.toLowerCase() }
      ]
    })
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' })
    }

    // Check account limits per phone number (max 2 accounts)
    const existingAccounts = await User.find({ phone })
    const accountCount = existingAccounts.length

    if (accountCount >= 2) {
      return res.status(400).json({ 
        message: 'Maximum account limit reached. You can only create 2 accounts per phone number.'
      })
    }

    // Check if account type already exists for this phone
    const existingAccountType = existingAccounts.find(acc => acc.accountType === accountType)
    if (existingAccountType) {
      return res.status(400).json({ 
        message: `You already have a ${accountType} account with this phone number.`
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Calculate accounts remaining
    const accountsRemaining = 2 - accountCount - 1

    // Create user
    const user = new User({
      phone,
      email: email || undefined,
      accountType,
      accountsRemaining,
      username: username.toLowerCase(),
      password: hashedPassword,
      profile: {
        fullName: name,
        username: username.toLowerCase(),
        isPrivate: accountType === 'business' ? false : true,
      },
      subscription: {
        tier: 'basic',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      },
    })

    await user.save()

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    })

    res.json({
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        accountType: user.accountType,
        profile: user.profile,
        subscription: user.subscription,
      },
    })
  } catch (error: any) {
    console.error('Create password error:', error)
    if (error.code === 11000) {
      // Duplicate key error (username already exists)
      return res.status(400).json({ message: 'Username already taken' })
    }
    res.status(500).json({ message: error.message || 'Failed to create account' })
  }
}

export const loginWithPassword = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    // Find user by username (check both root username and profile.username)
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { 'profile.username': username.toLowerCase() }
      ]
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({ message: 'Password not set. Please use OTP login or set a password.' })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    })

    // Update last active
    user.lastActive = new Date()
    await user.save()

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        accountType: user.accountType,
        profile: user.profile,
        subscription: user.subscription,
      },
    })
  } catch (error: any) {
    console.error('Login with password error:', error)
    res.status(500).json({ message: error.message || 'Login failed' })
  }
}

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-phone -emergencyContacts')
      .populate('followers', 'profile')
      .populate('following', 'profile')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      user: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        accountType: user.accountType,
        profile: user.profile,
        subscription: user.subscription,
        followers: user.followers,
        following: user.following,
        accountsRemaining: user.accountsRemaining,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, we can track logout for analytics
    // or implement token blacklisting here if needed.
    
    res.json({ message: 'Logout successful' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}



