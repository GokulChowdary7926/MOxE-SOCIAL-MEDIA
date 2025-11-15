import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import User from '../models/User'

interface SocketUser {
  socketId: string
  userId: string
  username?: string
  isOnline: boolean
  lastSeen?: Date
}

const onlineUsers = new Map<string, SocketUser>()

export const setupSocketIO = (io: Server) => {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
      const user = await User.findById(decoded.userId)
      
      if (!user) {
        return next(new Error('User not found'))
      }

      socket.data.user = user
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket: Socket) => {
    try {
      const user = socket.data.user
      
      if (!user || !user._id) {
        console.error('Invalid user data in socket connection')
        socket.disconnect()
        return
      }
      
      // Track online user
      onlineUsers.set(user._id.toString(), {
        socketId: socket.id,
        userId: user._id.toString(),
        username: user.profile?.username,
        isOnline: true,
        lastSeen: new Date(),
      })

      console.log(`✅ User connected: ${user.profile?.fullName || 'Unknown'} (${socket.id})`)

      // Join user's personal room
      socket.join(`user:${user._id}`)
      
      // Join user's followers' rooms for notifications
      if (user.following && Array.isArray(user.following)) {
        user.following.forEach((followedId: any) => {
          try {
            const id = followedId.toString ? followedId.toString() : String(followedId)
            socket.join(`notifications:${id}`)
          } catch (err) {
            // Skip invalid IDs
          }
        })
      }

      // Broadcast user online status
      socket.broadcast.emit('user_online', {
        userId: user._id,
        username: user.profile?.username,
        fullName: user.profile?.fullName,
        timestamp: new Date(),
      })

      // Send current online status to user
      socket.emit('online_status_update', {
        onlineUsers: Array.from(onlineUsers.values()).map(u => ({
          userId: u.userId,
          username: u.username,
          isOnline: u.isOnline,
        })),
      })

    // Post events - Enhanced real-time broadcasting
    socket.on('post_created', (data) => {
      // Notify followers and public feed
      const followers = user.followers || []
      followers.forEach((followerId: any) => {
        io.to(`user:${followerId}`).emit('new_post', {
          ...data,
          timestamp: new Date(),
        })
      })
      // Also broadcast to public if post is public
      if (data.post?.visibility?.type === 'public') {
        io.emit('new_post_public', {
          ...data,
          timestamp: new Date(),
        })
      }
    })

      socket.on('post_liked', (data) => {
        try {
          io.emit('post_liked', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in post_liked handler:', err)
        }
      })

      socket.on('post_disliked', (data) => {
        try {
          io.emit('post_disliked', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in post_disliked handler:', err)
        }
      })

      socket.on('post_shared', (data) => {
        try {
          io.emit('post_shared', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in post_shared handler:', err)
        }
      })

      // Comment events
      socket.on('comment_added', (data) => {
        try {
          io.emit('new_comment', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in comment_added handler:', err)
        }
      })

      socket.on('comment_liked', (data) => {
        try {
          io.emit('comment_liked', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in comment_liked handler:', err)
        }
      })

      // Story events
      socket.on('story_created', (data) => {
        try {
          const followers = user.followers || []
          if (Array.isArray(followers)) {
            followers.forEach((followerId: any) => {
              try {
                const id = followerId.toString ? followerId.toString() : String(followerId)
                io.to(`user:${id}`).emit('new_story', {
                  ...data,
                  timestamp: new Date(),
                })
              } catch (err) {
                // Skip invalid IDs
              }
            })
          }
        } catch (err) {
          console.error('Error in story_created handler:', err)
        }
      })

    socket.on('story_viewed', (data) => {
      io.to(`user:${data.authorId}`).emit('story_viewed', {
        ...data,
        timestamp: new Date(),
      })
    })

    // Chat events with typing indicators
    socket.on('send_message', (data) => {
      const { conversationId, message, recipientId } = data
      
      // Send to recipient
      io.to(`user:${recipientId}`).emit('new_message', {
        message,
        conversationId,
        timestamp: new Date(),
      })

      // Send read receipt request
      io.to(`user:${recipientId}`).emit('message_received', {
        messageId: message._id,
        timestamp: new Date(),
      })
    })

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // Typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId, recipientId } = data
      socket.to(`user:${recipientId}`).emit('user_typing', {
        userId: user._id,
        username: user.profile?.username,
        fullName: user.profile?.fullName,
        conversationId,
        timestamp: new Date(),
      })
    })

    socket.on('typing_stop', (data) => {
      const { conversationId, recipientId } = data
      socket.to(`user:${recipientId}`).emit('user_stopped_typing', {
        userId: user._id,
        conversationId,
        timestamp: new Date(),
      })
    })

    // Read receipts
    socket.on('message_read', (data) => {
      const { messageId, senderId } = data
      io.to(`user:${senderId}`).emit('message_read_receipt', {
        messageId,
        readBy: user._id,
        timestamp: new Date(),
      })
    })

    // Location events
    socket.on('location_update', (data) => {
      socket.broadcast.emit('location_updated', {
        userId: user._id,
        location: data.location,
        timestamp: new Date(),
      })
    })

    socket.on('sos_activated', (data) => {
      // Notify emergency contacts and nearby users
      io.emit('sos_alert', {
        userId: user._id,
        userName: user.profile?.fullName,
        location: data.location,
        emergencyContacts: data.emergencyContacts,
        timestamp: new Date(),
      })
    })

    socket.on('nearby_message', (data) => {
      // Broadcast to nearby users
      io.emit('nearby_message_received', {
        ...data,
        senderId: user._id,
        timestamp: new Date(),
      })
    })

    // Notification events
    socket.on('notification_read', (data) => {
      // Mark notification as read
      socket.emit('notification_read_confirmed', {
        notificationId: data.notificationId,
        timestamp: new Date(),
      })
    })

    // Live reactions (like Instagram/Facebook)
    socket.on('live_reaction', (data) => {
      const { postId, reactionType } = data
      io.emit('live_reaction_received', {
        postId,
        reactionType,
        userId: user._id,
        username: user.profile?.username,
        timestamp: new Date(),
      })
    })

    // Follow/Unfollow events
    socket.on('user_followed', (data) => {
      const { targetUserId } = data
      io.to(`user:${targetUserId}`).emit('new_follower', {
        followerId: user._id,
        followerName: user.profile?.fullName,
        timestamp: new Date(),
      })
    })

    socket.on('user_unfollowed', (data) => {
      const { targetUserId } = data
      io.to(`user:${targetUserId}`).emit('follower_removed', {
        followerId: user._id,
        timestamp: new Date(),
      })
    })

      // Disconnect handler
      socket.on('disconnect', () => {
        try {
          console.log(`❌ User disconnected: ${user.profile?.fullName || 'Unknown'}`)
          
          // Update online status
          const userStatus = onlineUsers.get(user._id.toString())
          if (userStatus) {
            userStatus.isOnline = false
            userStatus.lastSeen = new Date()
          }

          // Broadcast user offline status
          socket.broadcast.emit('user_offline', {
            userId: user._id,
            username: user.profile?.username,
            lastSeen: new Date(),
          })
        } catch (err) {
          console.error('Error in disconnect handler:', err)
        }
      })

    // Heartbeat to keep connection alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() })
    })

    // Message reactions
    socket.on('message_reaction', (data) => {
      const { messageId, emoji, conversationId } = data
      io.to(`conversation:${conversationId}`).emit('message_reaction_received', {
        messageId,
        emoji,
        userId: user._id,
        username: user.profile?.username,
        timestamp: new Date(),
      })
    })

    // Story reactions
    socket.on('story_reaction', (data) => {
      const { storyId, reactionType } = data
      io.to(`user:${data.authorId}`).emit('story_reaction_received', {
        storyId,
        reactionType,
        userId: user._id,
        username: user.profile?.username,
        timestamp: new Date(),
      })
    })

    // Save/Unsave post
    socket.on('post_saved', (data) => {
      io.emit('post_saved_update', {
        ...data,
        userId: user._id,
        timestamp: new Date(),
      })
    })

    // View post/story
    socket.on('content_viewed', (data) => {
      const { contentId, contentType, authorId } = data
      if (authorId && authorId.toString() !== user._id.toString()) {
        io.to(`user:${authorId}`).emit('content_view_update', {
          contentId,
          contentType,
          viewerId: user._id,
          timestamp: new Date(),
        })
      }
    })

    // Proximity alert
    socket.on('proximity_alert', (data) => {
      const { trustedContactId, distance } = data
      io.to(`user:${trustedContactId}`).emit('proximity_alert_received', {
        userId: user._id,
        username: user.profile?.username,
        distance,
        location: data.location,
        timestamp: new Date(),
      })
    })

    // Voice call events
    socket.on('call_initiated', (data) => {
      const { recipientId, callType } = data
      io.to(`user:${recipientId}`).emit('incoming_call', {
        callerId: user._id,
        callerName: user.profile?.fullName,
        callType,
        timestamp: new Date(),
      })
    })

    socket.on('call_answered', (data) => {
      const { callId, recipientId } = data
      io.to(`user:${recipientId}`).emit('call_answered', {
        callId,
        timestamp: new Date(),
      })
    })

    socket.on('call_ended', (data) => {
      const { callId, recipientId } = data
      io.to(`user:${recipientId}`).emit('call_ended', {
        callId,
        timestamp: new Date(),
      })
    })

      // Notification preferences update
      socket.on('notification_preferences_updated', (data) => {
        try {
          socket.emit('notification_preferences_confirmed', {
            ...data,
            timestamp: new Date(),
          })
        } catch (err) {
          console.error('Error in notification_preferences_updated handler:', err)
        }
      })
    } catch (error: any) {
      console.error('Error in socket connection handler:', error)
      socket.disconnect()
    }
  })

  // Periodic cleanup and health check
  setInterval(() => {
    // Cleanup stale connections (older than 5 minutes)
    const now = Date.now()
    onlineUsers.forEach((userStatus, userId) => {
      if (!userStatus.isOnline && userStatus.lastSeen) {
        const timeSinceLastSeen = now - userStatus.lastSeen.getTime()
        if (timeSinceLastSeen > 5 * 60 * 1000) {
          onlineUsers.delete(userId)
        }
      }
    })
  }, 60000) // Every minute
}

export default setupSocketIO
