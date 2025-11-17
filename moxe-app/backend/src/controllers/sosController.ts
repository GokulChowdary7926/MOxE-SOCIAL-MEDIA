import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import twilio from 'twilio'

// Store active SOS states
const activeSOS: Map<string, { activatedAt: Date; location: any; emergencyContacts: any[] }> = new Map()

// Helper to get Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (!accountSid || !authToken) {
    return null
  }
  
  try {
    return twilio(accountSid, authToken)
  } catch (error) {
    return null
  }
}

// Activate SOS (can be triggered by voice detection or manual)
export const activateSOS = async (req: AuthRequest, res: Response) => {
  try {
    const { location, triggeredBy } = req.body // triggeredBy: 'manual' | 'voice'
    const user = await User.findById(req.user._id).populate('emergencyContacts')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if SOS is already active
    const userId = (user._id as any).toString()
    if (activeSOS.has(userId)) {
      return res.status(400).json({ message: 'SOS is already active' })
    }

    // Get user location if not provided
    const userLocation = location || {
      latitude: user.location?.latitude,
      longitude: user.location?.longitude,
    }

    if (!userLocation.latitude || !userLocation.longitude) {
      return res.status(400).json({ message: 'Location is required for SOS activation' })
    }

    // Store active SOS
    activeSOS.set(userId, {
      activatedAt: new Date(),
      location: userLocation,
      emergencyContacts: user.emergencyContacts || [],
    })

    // Send alerts to emergency contacts
    const twilioClient = getTwilioClient()
    const emergencyContacts = user.emergencyContacts || []

    for (const contact of emergencyContacts) {
      if (contact.phone && twilioClient) {
        try {
          await twilioClient.messages.create({
            body: `🚨 EMERGENCY ALERT from ${user.profile?.fullName || 'MOxE User'}\n\nLocation: ${userLocation.latitude}, ${userLocation.longitude}\nTime: ${new Date().toLocaleString()}\n\nTriggered by: ${triggeredBy || 'manual'}\n\nPlease check on them immediately!`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`,
          })
        } catch (error) {
          console.error(`Failed to send SMS to ${contact.phone}:`, error)
        }
      }
    }

    // Emit Socket.io event
    const io = req.app.get('io')
    if (io) {
      io.emit('sos_activated', {
        userId: user._id,
        userName: user.profile?.fullName,
        location: userLocation,
        triggeredBy: triggeredBy || 'manual',
        timestamp: new Date(),
      })
    }

    res.json({
      message: 'SOS activated successfully',
      location: userLocation,
      emergencyContactsNotified: emergencyContacts.length,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Cancel SOS
export const cancelSOS = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const userId = (user._id as any).toString()
    if (!activeSOS.has(userId)) {
      return res.status(400).json({ message: 'No active SOS to cancel' })
    }

    activeSOS.delete(userId)

    // Emit Socket.io event
    const io = req.app.get('io')
    if (io) {
      io.emit('sos_cancelled', {
        userId: userId,
        timestamp: new Date(),
      })
    }

    res.json({ message: 'SOS cancelled successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Voice detection for SOS (called when "HELP" is detected)
export const detectDistressVoice = async (req: AuthRequest, res: Response) => {
  try {
    const { audioData, location } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // In a real implementation, you would:
    // 1. Process audioData with ML model to detect distress sounds
    // 2. Check for keywords like "HELP", "HELP HELP HELP"
    // 3. Analyze volume and frequency patterns

    // For now, we'll simulate detection
    // In production, integrate with speech recognition API or ML model

    // Check if SOS should be activated
    const shouldActivate = true // Replace with actual detection logic

    if (shouldActivate) {
      // Auto-activate SOS
      const sosData = {
        location: location || {
          latitude: user.location?.latitude,
          longitude: user.location?.longitude,
        },
        triggeredBy: 'voice',
      }

      // Call activateSOS logic
      req.body = sosData
      return activateSOS(req, res)
    }

    res.json({ message: 'Voice analyzed, no distress detected' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Get SOS status
export const getSOSStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const sosData = activeSOS.get((user._id as any).toString())

    res.json({
      isActive: !!sosData,
      sosData: sosData || null,
      emergencyContacts: user.emergencyContacts || [],
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Add emergency contact
export const addEmergencyContact = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, relationship, isPrimary } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!name || !phone || !relationship) {
      return res.status(400).json({ message: 'Name, phone, and relationship are required' })
    }

    // Validate phone number
    const cleanedPhone = phone.replace(/\D/g, '')
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({ message: 'Invalid phone number format' })
    }

    // Add contact
    if (!user.emergencyContacts) {
      user.emergencyContacts = []
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      user.emergencyContacts.forEach((contact: any) => {
        contact.isPrimary = false
      })
    }

    user.emergencyContacts.push({
      name,
      phone: cleanedPhone,
      relationship,
      isPrimary: isPrimary || false,
    })

    await user.save()

    res.json({
      message: 'Emergency contact added successfully',
      emergencyContacts: user.emergencyContacts,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Get emergency contacts
export const getEmergencyContacts = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      emergencyContacts: user.emergencyContacts || [],
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}
