import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { useSocket } from '../hooks/useSocket'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'message' | 'story' | 'mention'
  message: string
  userId?: string
  username?: string
  postId?: string
  timestamp: Date
  isRead: boolean
}

export default function Notifications() {
  const { socket, isConnected } = useSocket()
  const { user } = useSelector((state: RootState) => state.auth)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isConnected || !socket) return

    // Listen for real-time notifications
    socket.on('new_post', (data: any) => {
      addNotification({
        id: `post-${Date.now()}`,
        type: 'follow',
        message: `${data.author?.profile?.fullName || 'Someone'} posted something new`,
        userId: data.author?._id,
        username: data.author?.profile?.username,
        timestamp: new Date(),
        isRead: false,
      })
    })

    socket.on('post_liked', (data: any) => {
      addNotification({
        id: `like-${Date.now()}`,
        type: 'like',
        message: `${data.user?.profile?.fullName || 'Someone'} liked your post`,
        userId: data.user?._id,
        username: data.user?.profile?.username,
        postId: data.postId,
        timestamp: new Date(),
        isRead: false,
      })
    })

    socket.on('new_comment', (data: any) => {
      if (data.postAuthorId === user?._id) {
        addNotification({
          id: `comment-${Date.now()}`,
          type: 'comment',
          message: `${data.commenterName || 'Someone'} commented on your post`,
          userId: data.commenterId,
          username: data.commenterName,
          postId: data.postId,
          timestamp: new Date(),
          isRead: false,
        })
      }
    })

    socket.on('user_followed', (data: any) => {
      if (data.targetUserId === user?._id) {
        addNotification({
          id: `follow-${Date.now()}`,
          type: 'follow',
          message: `${data.followerName || 'Someone'} started following you`,
          userId: data.followerId,
          username: data.followerName,
          timestamp: new Date(),
          isRead: false,
        })
      }
    })

    socket.on('new_message', (data: any) => {
      addNotification({
        id: `message-${Date.now()}`,
        type: 'message',
        message: `${data.message?.sender?.profile?.fullName || 'Someone'} sent you a message`,
        userId: data.message?.sender?._id,
        username: data.message?.sender?.profile?.username,
        timestamp: new Date(),
        isRead: false,
      })
    })

    socket.on('new_story', (data: any) => {
      addNotification({
        id: `story-${Date.now()}`,
        type: 'story',
        message: `${data.author?.profile?.fullName || 'Someone'} posted a new story`,
        userId: data.author?._id,
        username: data.author?.profile?.username,
        timestamp: new Date(),
        isRead: false,
      })
    })

    return () => {
      socket.off('new_post')
      socket.off('post_liked')
      socket.off('new_comment')
      socket.off('user_followed')
      socket.off('new_message')
      socket.off('new_story')
    }
  }, [isConnected, socket, user])

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50)) // Keep last 50
    setUnreadCount((prev) => prev + 1)
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.message, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      })
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return 'fas fa-heart text-danger'
      case 'comment':
        return 'fas fa-comment text-primary-light'
      case 'follow':
        return 'fas fa-user-plus text-success'
      case 'message':
        return 'fas fa-envelope text-accent'
      case 'story':
        return 'fas fa-circle text-warning'
      case 'mention':
        return 'fas fa-at text-primary'
      default:
        return 'fas fa-bell text-text-gray'
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-bell text-primary-light"></i>
            Notifications
            {unreadCount > 0 && (
              <span className="bg-danger text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-primary-light text-sm hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-text-gray">
            <i className="fas fa-bell-slash text-4xl mb-4"></i>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  notif.isRead ? 'bg-light-gray' : 'bg-primary/10 border border-primary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.isRead ? 'bg-light-gray' : 'bg-primary/20'
                  }`}>
                    <i className={getNotificationIcon(notif.type)}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-text-gray mt-1">
                      {new Date(notif.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


