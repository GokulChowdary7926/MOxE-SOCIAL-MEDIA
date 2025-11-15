import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      nearbyMessaging: {
        radius: user.settings?.nearbyMessaging?.radius || 1000,
        anonymousMode: user.settings?.nearbyMessaging?.anonymousMode || false,
      },
      sosProtection: {
        enableVoiceDetection: user.settings?.sosProtection?.enableVoiceDetection || false,
        autoSendOnDistress: user.settings?.sosProtection?.autoSendOnDistress || false,
        backgroundMonitoring: user.settings?.sosProtection?.backgroundMonitoring || false,
      },
      proximityAlerts: {
        enabled: user.settings?.proximityAlerts?.enabled || false,
      },
      translation: {
        preferredLanguage: user.settings?.translation?.preferredLanguage || 'auto',
        autoTranslate: user.settings?.translation?.autoTranslate || false,
        showOriginal: user.settings?.translation?.showOriginal || false,
      },
      notifications: {
        pushNotifications: user.settings?.notifications?.pushNotifications !== undefined 
          ? user.settings.notifications.pushNotifications 
          : true,
        emailNotifications: user.settings?.notifications?.emailNotifications !== undefined
          ? user.settings.notifications.emailNotifications
          : true,
      },
      general: {
        dataSharing: user.settings?.general?.dataSharing !== undefined 
          ? user.settings.general.dataSharing 
          : true,
        adPersonalization: user.settings?.general?.adPersonalization !== undefined
          ? user.settings.general.adPersonalization
          : false,
      },
      contentSettings: user.settings?.contentSettings || {},
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { nearbyMessaging, sosProtection, proximityAlerts, translation, notifications, dataSharing, adPersonalization, contentSettings } = req.body
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!user.settings) {
      user.settings = {}
    }

    if (nearbyMessaging) {
      user.settings.nearbyMessaging = {
        radius: nearbyMessaging.radius || user.settings.nearbyMessaging?.radius || 1000,
        anonymousMode: nearbyMessaging.anonymousMode !== undefined 
          ? nearbyMessaging.anonymousMode 
          : user.settings.nearbyMessaging?.anonymousMode || false,
      }
    }

    if (sosProtection) {
      user.settings.sosProtection = {
        enableVoiceDetection: sosProtection.enableVoiceDetection !== undefined
          ? sosProtection.enableVoiceDetection
          : user.settings.sosProtection?.enableVoiceDetection || false,
        autoSendOnDistress: sosProtection.autoSendOnDistress !== undefined
          ? sosProtection.autoSendOnDistress
          : user.settings.sosProtection?.autoSendOnDistress || false,
        backgroundMonitoring: sosProtection.backgroundMonitoring !== undefined
          ? sosProtection.backgroundMonitoring
          : user.settings.sosProtection?.backgroundMonitoring || false,
      }
    }

    if (proximityAlerts) {
      user.settings.proximityAlerts = {
        enabled: proximityAlerts.enabled !== undefined
          ? proximityAlerts.enabled
          : user.settings.proximityAlerts?.enabled || false,
      }
    }

    if (translation) {
      user.settings.translation = {
        preferredLanguage: translation.preferredLanguage || user.settings.translation?.preferredLanguage || 'auto',
        autoTranslate: translation.autoTranslate !== undefined
          ? translation.autoTranslate
          : user.settings.translation?.autoTranslate || false,
        showOriginal: translation.showOriginal !== undefined
          ? translation.showOriginal
          : user.settings.translation?.showOriginal || false,
      }
    }

    if (notifications) {
      user.settings.notifications = {
        pushNotifications: notifications.pushNotifications !== undefined
          ? notifications.pushNotifications
          : user.settings.notifications?.pushNotifications !== undefined
          ? user.settings.notifications.pushNotifications
          : true,
        emailNotifications: notifications.emailNotifications !== undefined
          ? notifications.emailNotifications
          : user.settings.notifications?.emailNotifications !== undefined
          ? user.settings.notifications.emailNotifications
          : true,
      }
    }

    if (dataSharing !== undefined || adPersonalization !== undefined) {
      const currentDataSharing = user.settings.general?.dataSharing !== undefined 
        ? user.settings.general.dataSharing 
        : true
      const currentAdPersonalization = user.settings.general?.adPersonalization !== undefined
        ? user.settings.general.adPersonalization
        : false
      
      user.settings.general = {
        dataSharing: dataSharing !== undefined ? dataSharing : currentDataSharing,
        adPersonalization: adPersonalization !== undefined ? adPersonalization : currentAdPersonalization,
      }
    }

    if (contentSettings) {
      user.settings.contentSettings = {
        ...user.settings.contentSettings,
        ...contentSettings,
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

