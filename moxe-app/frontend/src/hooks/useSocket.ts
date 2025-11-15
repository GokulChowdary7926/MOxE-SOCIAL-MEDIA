import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { initSocket, getSocket, disconnectSocket } from '../services/socket'
import { fetchFeed } from '../store/slices/postSlice'
import { Socket } from 'socket.io-client'

export const useSocket = () => {
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])

  useEffect(() => {
    if (isAuthenticated && token) {
      let mounted = true
      let socketInstance: Socket | null = null
      
      // Small delay to prevent multiple connections during hot reload
      const initTimeout = setTimeout(() => {
        if (mounted) {
          socketInstance = initSocket(token)
          
          // Use socket.connected to check initial state
          if (mounted && socketInstance) {
            setIsConnected(socketInstance.connected)
          }
          
          const handleConnect = () => {
            if (mounted) {
              console.log('✅ Socket connected')
              setIsConnected(true)
            }
          }

          const handleDisconnect = (reason: string) => {
            if (mounted) {
              // Don't log ping timeout as error - it's normal during reconnection
              if (reason !== 'ping timeout' && reason !== 'transport close') {
                console.log('❌ Socket disconnected:', reason)
              }
              setIsConnected(false)
            }
          }

          const handleConnectError = (error: any) => {
            // Only log non-transient errors
            if (error.message && 
                !error.message.includes('xhr poll error') && 
                !error.message.includes('timeout')) {
              console.error('Socket connection error:', error.message)
            }
            if (mounted) {
              setIsConnected(false)
            }
          }
          
          if (socketInstance) {
            socketInstance.on('connect', handleConnect)
            socketInstance.on('disconnect', handleDisconnect)
            socketInstance.on('connect_error', handleConnectError)

            // Online status updates
            socketInstance.on('online_status_update', (data: any) => {
              if (mounted) {
                setOnlineUsers(data.onlineUsers || [])
              }
            })

            socketInstance.on('user_online', (data: any) => {
              if (mounted) {
                setOnlineUsers((prev) => {
                  const exists = prev.find((u: any) => u.userId === data.userId)
                  if (exists) {
                    return prev.map((u: any) => 
                      u.userId === data.userId ? { ...u, isOnline: true } : u
                    )
                  }
                  return [...prev, { userId: data.userId, username: data.username, isOnline: true }]
                })
              }
            })

            socketInstance.on('user_offline', (data: any) => {
              if (mounted) {
                setOnlineUsers((prev) =>
                  prev.map((u: any) =>
                    u.userId === data.userId ? { ...u, isOnline: false } : u
                  )
                )
              }
            })

            // Real-time feed updates
            socketInstance.on('new_post', (data: any) => {
              if (mounted) {
                console.log('📱 New post received:', data)
                dispatch(fetchFeed())
              }
            })

            socketInstance.on('new_post_public', (data: any) => {
              if (mounted) {
                console.log('🌐 New public post:', data)
                dispatch(fetchFeed())
              }
            })

            // Reconnection handling
            socketInstance.on('reconnect', (attemptNumber: number) => {
              if (mounted) {
                console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
                setIsConnected(true)
              }
            })

            socketInstance.on('reconnect_attempt', () => {
              if (mounted) {
                setIsConnected(false)
              }
            })

            socketInstance.on('reconnect_error', (error: any) => {
              if (mounted) {
                console.log('⚠️ Reconnection error:', error.message)
              }
            })

            socketInstance.on('reconnect_failed', () => {
              if (mounted) {
                console.error('❌ Socket reconnection failed')
                setIsConnected(false)
              }
            })
          }
        }
      }, 100) // Small delay to prevent rapid reconnections

      return () => {
        mounted = false
        clearTimeout(initTimeout)
        if (socketInstance) {
          socketInstance.off('connect')
          socketInstance.off('disconnect')
          socketInstance.off('connect_error')
          socketInstance.off('online_status_update')
          socketInstance.off('user_online')
          socketInstance.off('user_offline')
          socketInstance.off('new_post')
          socketInstance.off('new_post_public')
          socketInstance.off('reconnect')
          socketInstance.off('reconnect_attempt')
          socketInstance.off('reconnect_error')
          socketInstance.off('reconnect_failed')
        }
      }
    } else {
      disconnectSocket()
      setIsConnected(false)
      setOnlineUsers([])
    }
  }, [isAuthenticated, token, dispatch])

  return { 
    socket: getSocket(), 
    isConnected,
    onlineUsers,
  }
}

