import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Notification from '../models/Notification'
import User from '../models/User'

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const notifications = await Notification.find({ user: req.user._id })
      .populate('from', 'profile')
      .populate('post', 'content')
      .populate('comment', 'text')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean()

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    })

    res.json({
      notifications,
      unreadCount,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    notification.isRead = true
    await notification.save()

    res.json({ message: 'Notification marked as read' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    )

    res.json({ message: 'All notifications marked as read' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Helper function to create notifications (called from other controllers)
export const createNotification = async (
  userId: string,
  type: string,
  fromUserId: string,
  data?: {
    postId?: string
    commentId?: string
    messageId?: string
    storyId?: string
    message?: string
  }
) => {
  try {
    const notification = new Notification({
      user: userId,
      type: type as any,
      from: fromUserId,
      post: data?.postId,
      comment: data?.commentId,
      message: data?.messageId,
      story: data?.storyId,
      text: data?.message,
      isRead: false,
    })

    await notification.save()

    // Emit Socket.io event
    // This will be handled by the socket service
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

