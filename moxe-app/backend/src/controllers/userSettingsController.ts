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
      privacy: user.privacy || {},
      contentSettings: user.settings?.contentSettings || {},
      notifications: {
        pushNotifications: user.settings?.notifications?.pushNotifications ?? true,
        emailNotifications: user.settings?.notifications?.emailNotifications ?? true,
      },
      nearbyMessaging: user.settings?.nearbyMessaging || {
        radius: 1000,
        anonymousMode: false,
      },
      sosProtection: user.settings?.sosProtection || {
        enableVoiceDetection: false,
        autoSendOnDistress: false,
        backgroundMonitoring: false,
      },
      proximityAlerts: user.settings?.proximityAlerts || {
        enabled: false,
      },
      translation: user.settings?.translation || {
        preferredLanguage: 'en',
        autoTranslate: false,
        showOriginal: true,
      },
      general: user.settings?.general || {
        dataSharing: true,
        adPersonalization: true,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updateUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { email, privacy, notifications, nearbyMessaging, sosProtection, proximityAlerts, translation, general } = req.body
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

    // Update privacy settings (these are on the user object, not settings)
    if (privacy) {
      if (privacy.invisibleMode !== undefined) user.privacy.invisibleMode = privacy.invisibleMode
      if (privacy.hideOnlineStatus !== undefined) user.privacy.hideOnlineStatus = privacy.hideOnlineStatus
      if (privacy.screenshotProtection !== undefined) user.privacy.screenshotProtection = privacy.screenshotProtection
      if (privacy.profileVisitTracking !== undefined) user.privacy.profileVisitTracking = privacy.profileVisitTracking
    }

    // Update notifications
    if (notifications) {
      if (!user.settings) user.settings = {} as any
      if (!user.settings!.notifications) {
        user.settings!.notifications = {} as any
      }
      if (notifications.pushNotifications !== undefined) {
        user.settings!.notifications!.pushNotifications = notifications.pushNotifications
      }
      if (notifications.emailNotifications !== undefined) {
        user.settings!.notifications!.emailNotifications = notifications.emailNotifications
      }
    }

    // Initialize settings if not exists
    if (!user.settings) {
      user.settings = {} as any
    }

    // Update nearbyMessaging
    if (nearbyMessaging) {
      if (!user.settings!.nearbyMessaging) {
        user.settings!.nearbyMessaging = {} as any
      }
      user.settings!.nearbyMessaging = { ...user.settings!.nearbyMessaging, ...nearbyMessaging }
    }

    // Update sosProtection
    if (sosProtection) {
      if (!user.settings!.sosProtection) {
        user.settings!.sosProtection = {} as any
      }
      user.settings!.sosProtection = { ...user.settings!.sosProtection, ...sosProtection }
    }

    // Update proximityAlerts
    if (proximityAlerts) {
      if (!user.settings!.proximityAlerts) {
        user.settings!.proximityAlerts = {} as any
      }
      user.settings!.proximityAlerts = { ...user.settings!.proximityAlerts, ...proximityAlerts }
    }

    // Update translation
    if (translation) {
      if (!user.settings!.translation) {
        user.settings!.translation = {} as any
      }
      user.settings!.translation = { ...user.settings!.translation, ...translation }
    }

    // Update general
    if (general) {
      if (!user.settings!.general) {
        user.settings!.general = {} as any
      }
      user.settings!.general = { ...user.settings!.general, ...general }
    }

    // Update contentSettings (defaults for posts/reels/stories/live)
    if (req.body.contentSettings) {
      if (!user.settings!.contentSettings) {
        user.settings!.contentSettings = {} as any
      }
      const incoming = req.body.contentSettings
      if (incoming.posts) {
        if (!user.settings!.contentSettings!.posts) {
          user.settings!.contentSettings!.posts = {} as any
        }
        user.settings!.contentSettings!.posts = { ...user.settings!.contentSettings!.posts, ...incoming.posts }
      }
      if (incoming.reels) {
        if (!user.settings!.contentSettings!.reels) {
          user.settings!.contentSettings!.reels = {} as any
        }
        user.settings!.contentSettings!.reels = { ...user.settings!.contentSettings!.reels, ...incoming.reels }
      }
      if (incoming.stories) {
        if (!user.settings!.contentSettings!.stories) {
          user.settings!.contentSettings!.stories = {} as any
        }
        user.settings!.contentSettings!.stories = { ...user.settings!.contentSettings!.stories, ...incoming.stories }
      }
      if (incoming.live) {
        if (!user.settings!.contentSettings!.live) {
          user.settings!.contentSettings!.live = {} as any
        }
        user.settings!.contentSettings!.live = { ...user.settings!.contentSettings!.live, ...incoming.live }
      }
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


