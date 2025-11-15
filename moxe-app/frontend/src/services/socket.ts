import { io, Socket } from 'socket.io-client'

const getSocketURL = () => {
  // Use the same base URL as API but without /api
  const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
  const baseURL = apiURL.replace('/api', '')
  // Ensure we have a proper URL
  if (!baseURL.startsWith('http')) {
    return 'http://localhost:5001'
  }
  return baseURL
}

let socket: Socket | null = null

export const initSocket = (token: string): Socket => {
  // If socket exists and is connected, just update auth token if needed
  if (socket) {
    if (socket.connected) {
      // Update auth if token changed
      const currentAuth = socket.auth as { token?: string } | undefined
      if (currentAuth?.token !== token) {
        // Token changed, need to reconnect
        socket.disconnect()
        socket = null
      } else {
        // Same token, return existing socket
        return socket
      }
    } else {
      // Socket exists but not connected and not connecting - clean up and recreate
      try {
        socket.removeAllListeners()
        socket.disconnect()
      } catch (e) {
        // Ignore cleanup errors
      }
      socket = null
    }
  }

  const socketURL = getSocketURL()
  
  // Create new socket connection
  socket = io(socketURL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity, // Keep trying to reconnect
    reconnectionDelayMax: 5000,
    timeout: 20000, // Connection timeout
    withCredentials: true,
    forceNew: false, // Reuse existing connection if available
    autoConnect: true,
  })

  // Only set up event listeners once
  if (!socket.hasListeners('connect')) {
    socket.on('connect', () => {
      console.log('✅ Socket connected to:', socketURL)
    })

    socket.on('disconnect', (reason) => {
      // Only log unexpected disconnects (not ping timeout or transport close)
      if (reason !== 'io client disconnect' && 
          reason !== 'io server disconnect' && 
          reason !== 'ping timeout' &&
          reason !== 'transport close') {
        console.log('❌ Socket disconnected:', reason)
      }
    })

    socket.on('connect_error', (error) => {
      // Only log if it's not a normal connection attempt or timeout
      if (error.message && 
          !error.message.includes('xhr poll error') && 
          !error.message.includes('timeout')) {
        console.error('Socket connection error:', error.message)
      }
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Reconnection events
    socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
    })

    socket.on('reconnect_attempt', () => {
      console.log('🔄 Attempting to reconnect...')
    })

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed')
    })
  }

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Don't auto-initialize - let useSocket hook handle initialization
// This prevents multiple connections on page load

export default socket


