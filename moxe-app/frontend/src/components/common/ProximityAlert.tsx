import { useEffect, useState } from 'react'

interface ProximityAlertProps {
  userName: string
  distance: string
  onClose: () => void
}

export default function ProximityAlert({ userName, distance, onClose }: ProximityAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }

    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  return (
    <div
      className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-slideIn max-w-[90%]"
      style={{
        animation: 'slideIn 0.5s ease',
      }}
    >
      <i className="fas fa-map-marker-alt text-xl"></i>
      <span className="font-semibold">
        {userName} is {distance} away!
      </span>
    </div>
  )
}


