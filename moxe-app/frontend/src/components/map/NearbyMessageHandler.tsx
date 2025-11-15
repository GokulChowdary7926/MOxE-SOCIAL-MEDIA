import { useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'

export default function NearbyMessageHandler() {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (isConnected && socket) {
      socket.on('nearby_message', (data: any) => {
        // Show notification for nearby message
        const notification = document.createElement('div')
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-xl shadow-lg z-50'
        notification.innerHTML = `
          <div class="flex items-center gap-3">
            <i class="fas fa-broadcast-tower"></i>
            <div>
              <div class="font-semibold">${data.sender}</div>
              <div class="text-sm">${data.message}</div>
              <div class="text-xs opacity-75">Within ${data.distance}</div>
            </div>
          </div>
        `
        document.body.appendChild(notification)

        setTimeout(() => {
          notification.remove()
        }, 5000)
      })

      return () => {
        socket.off('nearby_message')
      }
    }
  }, [isConnected, socket])

  return null
}


