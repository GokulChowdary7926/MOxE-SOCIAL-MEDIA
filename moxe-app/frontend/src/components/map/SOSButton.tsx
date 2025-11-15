import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function SOSButton() {
  const [isActive, setIsActive] = useState(false)
  const [countdown, setCountdown] = useState(5)

  // Check SOS status on mount
  useEffect(() => {
    checkSOSStatus()
  }, [])

  const checkSOSStatus = async () => {
    try {
      const response = await api.get('/location/sos-status')
      setIsActive(response.data.isActive || false)
    } catch (error) {
      // If endpoint doesn't exist, assume not active
      setIsActive(false)
    }
  }

  const handleActivate = async () => {
    if (isActive) {
      // Cancel SOS
      try {
        await api.post('/location/sos-cancel')
        setIsActive(false)
        setCountdown(5)
        alert('SOS cancelled successfully')
      } catch (error: any) {
        console.error('Failed to cancel SOS:', error)
        const message = error.response?.data?.message || 'Failed to cancel SOS. Please try again.'
        alert(message)
      }
      return
    }

    // Start countdown
    let remaining = 5
    setCountdown(remaining)
    setIsActive(true)

    const countdownInterval = setInterval(() => {
      remaining--
      setCountdown(remaining)

      if (remaining <= 0) {
        clearInterval(countdownInterval)
        activateSOS()
      }
    }, 1000)
  }

  const activateSOS = async () => {
    try {
      // Check if SOS is already active first
      try {
        const statusResponse = await api.get('/location/sos-status')
        if (statusResponse.data.isActive) {
          setIsActive(true)
          alert('SOS is already active. Click again to cancel.')
          return
        }
      } catch (statusError) {
        // Status check failed, continue with activation
      }

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const response = await api.post('/location/sos-activate', {
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                triggeredBy: 'manual',
              })
              
              setIsActive(true)
              
              // Vibrate if supported
              if (navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500])
              }
              
              const contactsNotified = response.data.emergencyContactsNotified || 0
              alert(`SOS activated! ${contactsNotified} emergency contact(s) have been notified.`)
            } catch (error: any) {
              console.error('Failed to activate SOS:', error)
              const message = error.response?.data?.message || 'Failed to activate SOS. Please try again.'
              
              if (message.includes('already active')) {
                setIsActive(true)
                alert('SOS is already active. Click again to cancel.')
              } else {
                alert(message)
                setIsActive(false)
                setCountdown(5)
              }
            }
          },
          async () => {
            // Location not available, still try to activate SOS
            try {
              const response = await api.post('/location/sos-activate', {
                triggeredBy: 'manual',
              })
              setIsActive(true)
              const contactsNotified = response.data.emergencyContactsNotified || 0
              alert(`SOS activated! ${contactsNotified} emergency contact(s) have been notified.`)
            } catch (error: any) {
              console.error('Failed to activate SOS:', error)
              const message = error.response?.data?.message || 'Failed to activate SOS. Location may be required.'
              
              if (message.includes('already active')) {
                setIsActive(true)
                alert('SOS is already active. Click again to cancel.')
              } else {
                alert(message)
                setIsActive(false)
                setCountdown(5)
              }
            }
          }
        )
      } else {
        // Geolocation not available
        try {
          const response = await api.post('/location/sos-activate', {
            triggeredBy: 'manual',
          })
          setIsActive(true)
          const contactsNotified = response.data.emergencyContactsNotified || 0
          alert(`SOS activated! ${contactsNotified} emergency contact(s) have been notified.`)
        } catch (error: any) {
          console.error('Failed to activate SOS:', error)
          const message = error.response?.data?.message || 'Failed to activate SOS. Please try again.'
          
          if (message.includes('already active')) {
            setIsActive(true)
            alert('SOS is already active. Click again to cancel.')
          } else {
            alert(message)
            setIsActive(false)
            setCountdown(5)
          }
        }
      }
    } catch (error: any) {
      console.error('SOS activation error:', error)
      alert('Failed to activate SOS. Please try again.')
      setIsActive(false)
      setCountdown(5)
    }
  }

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <button
        onClick={handleActivate}
        className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg transition-all ${
          isActive ? 'bg-danger animate-pulse' : 'bg-danger hover:bg-red-600'
        }`}
      >
        {isActive ? (
          <span className="text-xl font-bold">{countdown}</span>
        ) : (
          <i className="fas fa-bell text-xl"></i>
        )}
      </button>
      <div className="text-white text-xs text-center mt-1 font-semibold">SOS</div>
    </div>
  )
}

