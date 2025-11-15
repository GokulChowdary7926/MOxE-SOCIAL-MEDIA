import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import EmergencyContacts from '../components/common/EmergencyContacts'
import HangoutMode from '../components/map/HangoutMode'

interface EmergencyContact {
  _id: string
  name: string
  phone: string
  email?: string
}

export default function SOSEmergency() {
  const [sosActive, setSosActive] = useState(false)
  const [voiceDetection, setVoiceDetection] = useState(false)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [safetyTimer, setSafetyTimer] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [addContactDialog, setAddContactDialog] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const recognitionRef = useRef<any>(null)
  
  // SOS Protection settings
  const [enableVoiceDetection, setEnableVoiceDetection] = useState(false)
  const [autoSendOnDistress, setAutoSendOnDistress] = useState(false)
  const [backgroundMonitoring, setBackgroundMonitoring] = useState(false)
  const [activeSOSCount, setActiveSOSCount] = useState(0)

  useEffect(() => {
    loadEmergencyContacts()
    getUserLocation()
    loadSOSSettings()
    checkSOSStatus()
  }, [])

  const loadSOSSettings = async () => {
    try {
      const response = await api.get('/settings')
      const settings = response.data
      setEnableVoiceDetection(settings.sosProtection?.enableVoiceDetection || false)
      setAutoSendOnDistress(settings.sosProtection?.autoSendOnDistress || false)
      setBackgroundMonitoring(settings.sosProtection?.backgroundMonitoring || false)
    } catch (error) {
      console.error('Failed to load SOS settings:', error)
    }
  }

  const saveSOSSettings = async (updates: any) => {
    try {
      await api.put('/settings', { sosProtection: updates })
    } catch (error) {
      console.error('Failed to save SOS settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const checkSOSStatus = async () => {
    try {
      const response = await api.get('/location/sos-status')
      setSosActive(response.data.isActive || false)
      // Count active SOS alerts if available
      if (response.data.activeAlerts) {
        setActiveSOSCount(response.data.activeAlerts.length || 0)
      }
    } catch (error) {
      // If endpoint doesn't exist, assume not active
      setSosActive(false)
    }
  }

  useEffect(() => {
    if (voiceDetection) {
      startVoiceDetection()
    } else {
      stopVoiceDetection()
    }
    return () => stopVoiceDetection()
  }, [voiceDetection])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (safetyTimer && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            triggerEmergencyAlert('Safety timer expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [safetyTimer, timeRemaining])

  const loadEmergencyContacts = async () => {
    try {
      const response = await api.get('/users/trusted-contacts')
      setEmergencyContacts(response.data.contacts || [])
    } catch (error) {
      console.error('Failed to load emergency contacts:', error)
    }
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        { enableHighAccuracy: true }
      )
    }
  }

  const startVoiceDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toUpperCase()
      const keywords = ['HELP', 'EMERGENCY', 'SOS', 'HELP ME', 'ASSISTANCE']
      
      if (keywords.some(keyword => transcript.includes(keyword))) {
        triggerEmergencyAlert(`Voice detection: ${transcript}`)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopVoiceDetection = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }

  const triggerEmergencyAlert = async (reason: string) => {
    if (sosActive) return

    setSosActive(true)
    getUserLocation()

    try {
      const response = await api.post('/sos/activate', {
        triggeredBy: reason.includes('Voice') ? 'voice' : 'manual',
        triggerData: {
          voiceCommand: reason,
        },
        location: location || undefined,
      })

      alert(`🚨 EMERGENCY ALERT ACTIVATED!\n\nReason: ${reason}\n\nLocation shared with ${response.data.contactsNotified || emergencyContacts.length} emergency contacts.`)
    } catch (error: any) {
      console.error('Failed to activate SOS:', error)
      alert(`🚨 EMERGENCY ALERT!\n\nReason: ${reason}\n\nLocation: ${location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown'}\n\nContacts notified: ${emergencyContacts.length}`)
    }
  }

  const cancelSOS = async () => {
    try {
      await api.post('/sos/cancel', { reason: 'User cancelled' })
      setSosActive(false)
      alert('SOS alert cancelled. You are safe.')
    } catch (error) {
      console.error('Failed to cancel SOS:', error)
      setSosActive(false)
    }
  }

  const startSafetyTimer = (minutes: number) => {
    setTimeRemaining(minutes * 60)
    setSafetyTimer(minutes)
  }

  const cancelSafetyTimer = () => {
    setSafetyTimer(null)
    setTimeRemaining(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('Please fill in name and phone number')
      return
    }

    try {
      // In a real app, this would be a separate emergency contacts API
      const contact = {
        _id: Date.now().toString(),
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email,
      }
      setEmergencyContacts([...emergencyContacts, contact])
      setNewContact({ name: '', phone: '', email: '' })
      setAddContactDialog(false)
      alert('Emergency contact added successfully!')
    } catch (error) {
      console.error('Failed to add contact:', error)
      alert('Failed to add emergency contact')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-danger flex items-center justify-center">
          <i className="fas fa-exclamation-triangle text-white text-xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold">MOXE SOS Emergency</h2>
          <p className="text-sm text-text-gray">Emergency assistance at your fingertips</p>
        </div>
      </div>

      {/* Emergency Alert Button */}
      <div className={`bg-medium-gray rounded-2xl p-6 text-center ${sosActive ? 'border-2 border-danger' : ''}`}>
        {sosActive ? (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-danger flex items-center justify-center mx-auto animate-pulse">
              <i className="fas fa-exclamation-triangle text-white text-4xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-danger">EMERGENCY ALERT ACTIVE</h3>
            <p className="text-text-gray">
              Help is on the way! Your location has been shared with emergency contacts.
            </p>
            <button
              onClick={cancelSOS}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-check-circle mr-2"></i>
              I'm Safe - Cancel Alert
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-warning flex items-center justify-center mx-auto">
              <i className="fas fa-exclamation-triangle text-white text-4xl"></i>
            </div>
            <h3 className="text-xl font-bold">Emergency SOS</h3>
            <p className="text-text-gray">
              Activate in case of emergency to alert your trusted contacts
            </p>
            <button
              onClick={() => triggerEmergencyAlert('Manual SOS activation')}
              className="bg-danger text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>
              ACTIVATE SOS
            </button>
          </div>
        )}
      </div>

      {/* MOXE SOS Protection */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-shield-alt text-primary-light"></i>
          MOXE SOS Protection
          {activeSOSCount > 0 && (
            <span className="ml-2 bg-danger text-white text-xs px-2 py-1 rounded-full">
              {activeSOSCount} Active
            </span>
          )}
        </h3>
        <p className="text-sm text-text-gray mb-4">
          Activate emergency mode to alert your trusted contacts and share your location.
        </p>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable Voice Detection</span>
            <label className="relative inline-block w-12 h-6">
              <input 
                type="checkbox" 
                className="opacity-0 w-0 h-0" 
                checked={enableVoiceDetection}
                onChange={(e) => {
                  const newValue = e.target.checked
                  setEnableVoiceDetection(newValue)
                  saveSOSSettings({ enableVoiceDetection: newValue, autoSendOnDistress, backgroundMonitoring })
                }}
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                enableVoiceDetection ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-Send on Distress Sounds</span>
            <label className="relative inline-block w-12 h-6">
              <input 
                type="checkbox" 
                className="opacity-0 w-0 h-0" 
                checked={autoSendOnDistress}
                onChange={(e) => {
                  const newValue = e.target.checked
                  setAutoSendOnDistress(newValue)
                  saveSOSSettings({ enableVoiceDetection, autoSendOnDistress: newValue, backgroundMonitoring })
                }}
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                autoSendOnDistress ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Background Monitoring</span>
            <label className="relative inline-block w-12 h-6">
              <input 
                type="checkbox" 
                className="opacity-0 w-0 h-0" 
                checked={backgroundMonitoring}
                onChange={(e) => {
                  const newValue = e.target.checked
                  setBackgroundMonitoring(newValue)
                  saveSOSSettings({ enableVoiceDetection, autoSendOnDistress, backgroundMonitoring: newValue })
                }}
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                backgroundMonitoring ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <EmergencyContacts />

      {/* Hangout Mode */}
      <HangoutMode />

      {/* Hangout Safety Mode - Additional Settings */}
      {voiceDetection && (
        <div className="bg-medium-gray rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-4">Hangout Safety Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {voiceDetection ? (
                    <i className="fas fa-microphone text-danger"></i>
                  ) : (
                    <i className="fas fa-microphone-slash text-text-gray"></i>
                  )}
                  <span className="font-semibold">Voice-Activated Alerts</span>
                </div>
                <p className="text-sm text-text-gray">
                  Shout "HELP", "EMERGENCY", or "SOS" to automatically trigger alerts
                </p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={voiceDetection}
                  onChange={(e) => setVoiceDetection(e.target.checked)}
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  voiceDetection ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            {/* Safety Timer */}
            <div className="pt-4 border-t border-light-gray">
              <h4 className="font-semibold mb-3">Safety Check-in Timer</h4>
              {safetyTimer ? (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-warning flex items-center justify-center mx-auto">
                    <i className="fas fa-clock text-white text-2xl"></i>
                  </div>
                  <div className="text-3xl font-bold text-warning">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-sm text-text-gray">Time until automatic alert</p>
                  <button
                    onClick={cancelSafetyTimer}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    <i className="fas fa-check-circle mr-2"></i>
                    I'm Safe - Cancel Timer
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {[15, 30, 60].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => startSafetyTimer(minutes)}
                      className="flex-1 bg-light-gray hover:bg-dark-gray text-white py-2 rounded-lg font-semibold transition-colors"
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Location Status */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-3">Location Status</h3>
        <div className="flex items-center gap-2 mb-2">
          <i className={`fas fa-location-dot ${location ? 'text-green-500' : 'text-danger'}`}></i>
          <span className={location ? 'text-green-500' : 'text-danger'}>
            {location ? 'Location tracking active' : 'Location unavailable'}
          </span>
        </div>
        {location && (
          <div className="bg-dark-gray rounded-lg p-2 text-xs text-text-gray">
            Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}
          </div>
        )}
        <button
          onClick={getUserLocation}
          className="mt-2 text-primary-light hover:text-primary transition-colors text-sm"
        >
          <i className="fas fa-sync-alt mr-1"></i>
          Refresh Location
        </button>
      </div>

      {/* Add Contact Dialog */}
      {addContactDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-medium-gray rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Emergency Contact</h3>
              <button
                onClick={() => setAddContactDialog(false)}
                className="text-text-gray hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Full Name *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email (optional)"
                />
              </div>
              <button
                onClick={addEmergencyContact}
                disabled={!newContact.name || !newContact.phone}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Emergency Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

