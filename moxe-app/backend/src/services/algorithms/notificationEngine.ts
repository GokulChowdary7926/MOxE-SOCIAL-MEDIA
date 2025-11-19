import Notification from '../../models/Notification'
import User from '../../models/User'
import mongoose from 'mongoose'
import { Server } from 'socket.io'

interface NotificationData {
  type: string
  recipientId: mongoose.Types.ObjectId | string
  actorId: mongoose.Types.ObjectId | string
  targetId?: mongoose.Types.ObjectId | string
  targetType?: 'post' | 'story' | 'comment' | 'user'
  metadata?: any
}

interface NotificationOptions {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export class NotificationEngine {
  private notificationTypes = {
    LIKE: 'like',
    COMMENT: 'comment',
    FOLLOW: 'follow',
    MENTION: 'mention',
    SHARE: 'share',
    STORY_VIEW: 'story',
    LIVE: 'live',
    POST: 'post',
  }

  private io: Server | null = null

  setSocketIO(io: Server) {
    this.io = io
  }

  async createNotification(notificationData: NotificationData) {
    const {
      type,
      recipientId,
      actorId,
      targetId,
      targetType,
      metadata = {},
    } = notificationData

    // Check notification preferences
    const shouldSend = await this.shouldSendNotification(recipientId, type)
    if (!shouldSend) return null

    const notification = new Notification({
      user: recipientId,
      type,
      from: actorId,
      post: targetType === 'post' ? targetId : undefined,
      comment: targetType === 'comment' ? targetId : undefined,
      story: targetType === 'story' ? targetId : undefined,
      message: metadata.message || undefined,
      isRead: false,
    })

    await notification.save()

    // Real-time delivery
    await this.deliverRealtimeNotification(notification)

    return notification
  }

  async shouldSendNotification(
    userId: mongoose.Types.ObjectId | string,
    notificationType: string
  ): Promise<boolean> {
    const user = await User.findById(userId).select('settings').lean()
    if (!user || !user.settings) return true

    const notificationSettings = user.settings.notifications
    if (!notificationSettings) return true

    // Map notification types to settings
    const settingMap: { [key: string]: string } = {
      like: 'pushNotifications',
      comment: 'pushNotifications',
      follow: 'pushNotifications',
      mention: 'pushNotifications',
      share: 'pushNotifications',
      story: 'pushNotifications',
      live: 'pushNotifications',
      post: 'pushNotifications',
    }

    const settingKey = settingMap[notificationType] || 'pushNotifications'
    return notificationSettings[settingKey as keyof typeof notificationSettings] !== false
  }

  async deliverRealtimeNotification(notification: any) {
    const populatedNotification = await Notification.findById(notification._id)
      .populate('from', 'username profile.fullName profile.avatar profile.isVerified')
      .populate('post')
      .populate('comment')
      .populate('story')
      .lean()

    if (!this.io) {
      console.warn('Socket.IO not initialized for notifications')
      return
    }

    // WebSocket delivery
    this.io.to(`user:${notification.user}`).emit('notification', populatedNotification)

    // Update notification badge count
    const unreadCount = await Notification.countDocuments({
      user: notification.user,
      isRead: false,
    })

    this.io.to(`user:${notification.user}`).emit('unread_count', unreadCount)
  }

  formatPushMessage(notification: any): { title: string; body: string } {
    const actorName =
      notification.from?.profile?.fullName ||
      notification.from?.username ||
      'Someone'

    const baseMessages: { [key: string]: { title: string; body: string } } = {
      [this.notificationTypes.LIKE]: {
        title: 'New like',
        body: `${actorName} liked your ${notification.post ? 'post' : 'content'}`,
      },
      [this.notificationTypes.COMMENT]: {
        title: 'New comment',
        body: `${actorName} commented on your ${notification.post ? 'post' : 'content'}`,
      },
      [this.notificationTypes.FOLLOW]: {
        title: 'New follower',
        body: `${actorName} started following you`,
      },
      [this.notificationTypes.MENTION]: {
        title: 'You were mentioned',
        body: `${actorName} mentioned you in a ${notification.post ? 'post' : 'comment'}`,
      },
      [this.notificationTypes.SHARE]: {
        title: 'New share',
        body: `${actorName} shared your ${notification.post ? 'post' : 'content'}`,
      },
      [this.notificationTypes.STORY_VIEW]: {
        title: 'Story view',
        body: `${actorName} viewed your story`,
      },
    }

    const template = baseMessages[notification.type]
    if (!template)
      return { title: 'New notification', body: 'You have a new notification' }

    return template
  }

  async markAsRead(
    notificationId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string
  ) {
    await Notification.updateOne(
      { _id: notificationId, user: userId },
      { isRead: true }
    )

    // Update real-time unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    })

    if (this.io) {
      this.io.to(`user:${userId}`).emit('unread_count', unreadCount)
    }
  }

  async markAllAsRead(userId: mongoose.Types.ObjectId | string) {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    )

    if (this.io) {
      this.io.to(`user:${userId}`).emit('unread_count', 0)
    }
  }

  async getNotificationsForUser(
    userId: mongoose.Types.ObjectId | string,
    options: NotificationOptions = {}
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = options

    const query: any = { user: userId }
    if (unreadOnly) {
      query.isRead = false
    }

    const notifications = await Notification.find(query)
      .populate('from', 'username profile.fullName profile.avatar profile.isVerified')
      .populate('post', 'content.media content.text')
      .populate('comment', 'text')
      .populate('story', 'media')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await Notification.countDocuments(query)

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        hasMore: total > page * limit,
      },
    }
  }
}

export default new NotificationEngine()

