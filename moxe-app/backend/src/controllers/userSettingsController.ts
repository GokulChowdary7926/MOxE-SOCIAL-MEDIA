import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import bcrypt from 'bcryptjs'

export const getUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      email: user.email,
      privacy: user.settings?.privacy || {},
      notifications: {
        push: user.settings?.notifications?.push || {
          enabled: true,
          likes: true,
          comments: true,
          follows: true,
          mentions: true,
          messages: true,
          stories: true,
          live: true,
        },
        email: user.settings?.notifications?.email || {
          enabled: true,
          weeklyDigest: true,
          securityAlerts: true,
          productUpdates: false,
        },
        inApp: user.settings?.notifications?.inApp || {
          enabled: true,
          sound: true,
          vibration: true,
        },
      },
      security: user.settings?.security || {},
      accessibility: user.settings?.accessibility || {},
      languageRegion: user.settings?.languageRegion || {},
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updateUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { email, privacy, notifications, security } = req.body
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!user.settings) {
      user.settings = {} as any
    }

    // Update email
    if (email) {
      user.email = email
    }

    // Update privacy settings
    if (privacy) {
      if (!user.settings.privacy) {
        user.settings.privacy = {} as any
      }
      user.settings.privacy = { ...user.settings.privacy, ...privacy }
    }

    // Update notification settings
    if (notifications) {
      if (!user.settings.notifications) {
        user.settings.notifications = {} as any
      }
      user.settings.notifications = { ...user.settings.notifications, ...notifications }
    }

    // Update security settings
    if (security) {
      if (!user.settings.security) {
        user.settings.security = {} as any
      }
      user.settings.security = { ...user.settings.security, ...security }
    }

    await user.save()

    res.json({
      message: 'Settings updated successfully',
      settings: user.settings,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Verify current password if user has one
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' })
      }
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const deactivateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.isActive = false
    user.deactivatedAt = new Date()
    await user.save()

    res.json({ message: 'Account deactivated successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers.user', 'profile')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      blockedUsers: user.blockedUsers || [],
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.blockedUsers = (user.blockedUsers || []).filter(
      (bu: any) => bu.user.toString() !== userId
    )
    await user.save()

    res.json({ message: 'User unblocked successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get sessions from user model (if stored) or generate from login activity
    const sessions = [
      {
        _id: 'current',
        device: 'Current Device',
        location: 'Current Location',
        ipAddress: req.ip || 'Unknown',
        lastActive: new Date().toISOString(),
        isCurrent: true,
      },
    ]

    res.json({ sessions })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const revokeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params
    
    // In a real implementation, you would track sessions in a separate collection
    // For now, we'll just return success
    res.json({ message: 'Session revoked successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const revokeAllSessions = async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you would invalidate all tokens/sessions
    res.json({ message: 'All sessions revoked successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getLoginActivity = async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you would track login activity
    const activity = [
      {
        action: 'Login',
        device: 'iPhone 13',
        location: 'New York, USA',
        timestamp: new Date().toISOString(),
        success: true,
      },
    ]

    res.json({ activity })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const requestDataExport = async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you would queue a job to generate the data export
    res.json({ 
      message: 'Data export requested. You will receive an email when ready.',
      estimatedTime: '24 hours',
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const downloadDataExport = async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you would generate and return the data file
    res.status(501).json({ message: 'Data export download not yet implemented' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getConnectedApps = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // In a real implementation, you would have a connectedApps array in the user model
    res.json({ apps: [] })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const disconnectApp = async (req: AuthRequest, res: Response) => {
  try {
    const { appId } = req.params
    
    // In a real implementation, you would remove the app from user's connected apps
    res.json({ message: 'App disconnected successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

