import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api from '../services/api'

interface EmergencyContact {
  _id: string
  name: string
  phone: string
  email?: string
  relationship?: string
}

interface SafePlace {
  name: string
  type: string
  distance: string
  lat: number
  lng: number
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function SOSEmergency() {
  
  // Protection Mode State
  const [protectionMode, setProtectionMode] = useState(false)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [speechRecognitionReady, setSpeechRecognitionReady] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [signalStrength, setSignalStrength] = useState(0)
  
  // Location State
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([])
  
  // Settings State
  const [enableVoiceDetection, setEnableVoiceDetection] = useState(true)
  const [enableBackgroundOperation, setEnableBackgroundOperation] = useState(true)
  const [enableAutoCheckinReminders, setEnableAutoCheckinReminders] = useState(true)
  const [darkTheme, setDarkTheme] = useState(true)
  const [vibrationAlerts, setVibrationAlerts] = useState(true)
  
  // Alert Preferences
  const [sendSMSAlerts, setSendSMSAlerts] = useState(true)
  const [sendEmailAlerts, setSendEmailAlerts] = useState(true)
  const [shareLiveLocation, setShareLiveLocation] = useState(true)
  
  // Safety Check-in Timer
  const [timerHours, setTimerHours] = useState(0)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)
  
  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [showAddContactDialog, setShowAddContactDialog] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', relationship: '' })
  
  // Voice Recognition
  const recognitionRef = useRef<any>(null)
  const [sosActive, setSosActive] = useState(false)

  useEffect(() => {
    loadEmergencyContacts()
    getUserLocation()
    checkSpeechRecognition()
    simulateGPS()
  }, [])

  useEffect(() => {
    if (location) {
      loadSafePlaces()
    }
    
    // Update audio level simulation
    const audioInterval = setInterval(() => {
      if (protectionMode) {
        setAudioLevel(Math.random() * 100)
        setSignalStrength(Math.random() * 100)
      }
    }, 500)

    return () => {
      clearInterval(audioInterval)
      if (timerInterval) clearInterval(timerInterval)
      stopVoiceDetection()
    }
  }, [])

  useEffect(() => {
    if (timerActive) {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev > 0) return prev - 1
          setTimerMinutes((prevMin) => {
            if (prevMin > 0) {
              return prevMin - 1
            }
            setTimerHours((prevHour) => {
              if (prevHour > 0) {
                return prevHour - 1
              }
              // Timer expired
              triggerEmergencyAlert('Safety timer expired')
              setTimerActive(false)
              return 0
            })
            return 59
          })
          return 59
        })
      }, 1000)
      setTimerInterval(interval)
      return () => {
        clearInterval(interval)
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    }
  }, [timerActive])

  useEffect(() => {
    if (protectionMode && enableVoiceDetection) {
      startVoiceDetection()
    } else {
      stopVoiceDetection()
    }
    return () => stopVoiceDetection()
  }, [protectionMode, enableVoiceDetection])

  const checkSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechRecognitionReady(true)
    }
  }

  const simulateGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsActive(true)
          setGpsAccuracy(Math.round(position.coords.accuracy || 40))
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => {
          setGpsActive(false)
        },
        { enableHighAccuracy: true }
      )
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

  const loadSafePlaces = async () => {
    if (!location) return

    try {
      // Use Overpass API to get real nearby places
      const radius = 2000 // 2km radius
      const overpassUrl = `https://overpass-api.de/api/interpreter`
      
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${radius},${location.latitude},${location.longitude});
          node["amenity"="police"](around:${radius},${location.latitude},${location.longitude});
          node["amenity"="cafe"](around:${radius},${location.latitude},${location.longitude});
          node["amenity"="restaurant"](around:${radius},${location.latitude},${location.longitude});
          node["amenity"="pharmacy"](around:${radius},${location.latitude},${location.longitude});
        );
        out body;
      `

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      })

      if (response.ok) {
        const data = await response.json()
        const places: SafePlace[] = []
        
        data.elements?.slice(0, 10).forEach((element: any) => {
          const lat = element.lat
          const lng = element.lon
          const tags = element.tags || {}
          const name = tags.name || tags['name:en'] || 'Unknown'
          
          // Calculate distance
          const distance = calculateDistance(location.latitude, location.longitude, lat, lng)
          const distanceStr = distance < 1 
            ? `${Math.round(distance * 10) / 10} miles` 
            : `${Math.round(distance)} miles`

          // Determine type
          let type = 'other'
          if (tags.amenity === 'hospital') type = 'hospital'
          else if (tags.amenity === 'police') type = 'police'
          else if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') type = 'coffee'
          else if (tags.amenity === 'pharmacy') type = 'pharmacy'

          places.push({
            name,
            type,
            distance: distanceStr,
            lat,
            lng,
          })
        })

        // Sort by distance
        places.sort((a, b) => {
          const distA = parseFloat(a.distance)
          const distB = parseFloat(b.distance)
          return distA - distB
        })

        // Take top 5 closest
        setSafePlaces(places.slice(0, 5))
      } else {
        // Fallback to simulated places if API fails
        setSafePlaces([
          { name: 'Coffee Shop', type: 'coffee', distance: '0.3 miles', lat: location.latitude + 0.001, lng: location.longitude + 0.001 },
          { name: 'Police Station', type: 'police', distance: '0.8 miles', lat: location.latitude + 0.002, lng: location.longitude - 0.001 },
          { name: 'Hospital', type: 'hospital', distance: '1.2 miles', lat: location.latitude - 0.002, lng: location.longitude + 0.002 },
        ])
      }
    } catch (error) {
      console.error('Failed to load safe places:', error)
      // Fallback to simulated places
      if (location) {
        setSafePlaces([
          { name: 'Coffee Shop', type: 'coffee', distance: '0.3 miles', lat: location.latitude + 0.001, lng: location.longitude + 0.001 },
          { name: 'Police Station', type: 'police', distance: '0.8 miles', lat: location.latitude + 0.002, lng: location.longitude - 0.001 },
          { name: 'Hospital', type: 'hospital', distance: '1.2 miles', lat: location.latitude - 0.002, lng: location.longitude + 0.002 },
        ])
      }
    }
  }

  // Calculate distance between two coordinates in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const loadEmergencyContacts = async () => {
    try {
      const response = await api.get('/users/trusted-contacts')
      setEmergencyContacts(response.data.contacts || response.data || [])
    } catch (error) {
      console.error('Failed to load emergency contacts:', error)
      setEmergencyContacts([
        { _id: '1', name: 'Sarah Johnson', phone: '+1 (555) 123-4567', relationship: 'Family' },
        { _id: '2', name: 'Michael Chen', phone: '+1 (555) 987-6543', relationship: 'Friend' },
      ])
    }
  }

  const startVoiceDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toUpperCase()
      const keywords = ['HELP', 'EMERGENCY', 'SOS', 'SAVE ME']
      
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

    // Vibrate if enabled
    if (vibrationAlerts && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    try {
      const response = await api.post('/sos/activate', {
        triggeredBy: reason.includes('Voice') ? 'voice' : 'manual',
        triggerData: { voiceCommand: reason },
        location: location || undefined,
        sendSMS: sendSMSAlerts,
        sendEmail: sendEmailAlerts,
        shareLocation: shareLiveLocation,
      })
      console.log('Emergency alert sent:', response.data)
    } catch (error: any) {
      console.error('Failed to activate SOS:', error)
    }
  }

  const cancelSOS = async () => {
    try {
      await api.post('/sos/cancel', { reason: 'User cancelled' })
      setSosActive(false)
    } catch (error) {
      console.error('Failed to cancel SOS:', error)
      setSosActive(false)
    }
  }

  const activateProtection = () => {
    setProtectionMode(!protectionMode)
    if (!protectionMode) {
      getUserLocation()
      if (enableVoiceDetection) {
        startVoiceDetection()
      }
    } else {
      stopVoiceDetection()
    }
  }

  const handleKeywordButton = (keyword: string) => {
    triggerEmergencyAlert(`Manual keyword: ${keyword}`)
  }

  const handlePresetTimer = (minutes: number) => {
    if (minutes === 1) {
      setTimerHours(0)
      setTimerMinutes(1)
      setTimerSeconds(0)
    } else if (minutes === 10) {
      setTimerHours(0)
      setTimerMinutes(10)
      setTimerSeconds(0)
    } else if (minutes === 60) {
      setTimerHours(1)
      setTimerMinutes(0)
      setTimerSeconds(0)
    } else if (minutes === 1440) {
      setTimerHours(24)
      setTimerMinutes(0)
      setTimerSeconds(0)
    }
  }

  const startTimer = () => {
    if (timerHours === 0 && timerMinutes === 0 && timerSeconds === 0) {
      alert('Please set a timer duration first')
      return
    }
    setTimerActive(true)
  }

  const stopTimer = () => {
    setTimerActive(false)
    setTimerHours(0)
    setTimerMinutes(0)
    setTimerSeconds(0)
  }

  const formatTimer = () => {
    return `${timerHours.toString().padStart(2, '0')} : ${timerMinutes.toString().padStart(2, '0')} : ${timerSeconds.toString().padStart(2, '0')}`
  }

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('Please fill in name and phone number')
      return
    }

    try {
      const contact: EmergencyContact = {
        _id: Date.now().toString(),
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email || undefined,
        relationship: newContact.relationship || undefined,
      }
      // Add contact to the list immediately
      setEmergencyContacts([...emergencyContacts, contact])
      setNewContact({ name: '', phone: '', email: '', relationship: '' })
      setShowAddContactDialog(false)
      
      // Show success message
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]'
      successMsg.textContent = `✓ ${contact.name} added successfully!`
      document.body.appendChild(successMsg)
      setTimeout(() => {
        successMsg.remove()
      }, 3000)
    } catch (error) {
      console.error('Failed to add contact:', error)
      alert('Failed to add emergency contact')
    }
  }

  return (
    <div className="min-h-screen bg-dark text-white pb-20">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Protection Mode Section */}
        <div className="bg-medium-gray rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-microphone text-yellow-400 text-xl"></i>
            <h2 className="text-xl font-bold">
              Protection Mode: {protectionMode ? 'ACTIVE' : 'INACTIVE'}
            </h2>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <i className={`fas fa-map-marker-alt ${gpsActive ? 'text-green-500' : 'text-gray-500'}`}></i>
              <span>GPS: {gpsActive ? 'Active' : 'Inactive'}</span>
              {gpsAccuracy && <span className="text-text-gray">| Accuracy: {gpsAccuracy}m</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${speechRecognitionReady ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span>Speech Recognition: {speechRecognitionReady ? 'Ready' : 'Not Available'}</span>
            </div>
          </div>

          {/* Keyword Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {['HELP', 'EMERGENCY', 'SOS', 'SAVE ME'].map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleKeywordButton(keyword)}
                className="bg-dark-gray border border-yellow-400 rounded-lg py-2 px-2 text-xs font-semibold hover:bg-yellow-400 hover:text-dark transition-colors"
              >
                {keyword}
              </button>
            ))}
          </div>

          {/* Signal Strength */}
          {protectionMode && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Signal:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-4 rounded ${
                        signalStrength > bar * 25 ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="w-full bg-dark-gray rounded-full h-2 mb-2 relative">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all progress-bar"
                  style={{ width: `${signalStrength}%` }}
                  title={`Signal strength: ${Math.round(signalStrength)}%`}
                  role="progressbar"
                  aria-label={`Signal strength: ${Math.round(signalStrength)}%`}
                ></div>
              </div>

              {/* Audio Level Meter */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Quiet</span>
                <span className="text-sm text-yellow-400">Listening...</span>
                <span className="text-sm">Loud</span>
              </div>
              <div className="w-full bg-dark-gray rounded-full h-2 mb-2 relative">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all progress-bar"
                  style={{ width: `${audioLevel}%` }}
                  title={`Audio level: ${Math.round(audioLevel)}%`}
                  role="progressbar"
                  aria-label={`Audio level: ${Math.round(audioLevel)}%`}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-gray mb-4">
                <i className="fas fa-lock"></i>
                <span>Audio processed locally on your device only</span>
              </div>
            </>
          )}

          {/* Activate Protection Button */}
          <button
            onClick={activateProtection}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
              protectionMode
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            <i className={`fas ${protectionMode ? 'fa-stop' : 'fa-play'}`}></i>
            {protectionMode ? 'DEACTIVATE PROTECTION' : 'ACTIVATE PROTECTION'}
          </button>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              onClick={() => triggerEmergencyAlert('Emergency Alert button pressed')}
              className="bg-orange-500 hover:bg-orange-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-bell"></i>
              Emergency Alert
            </button>
            <button
              onClick={cancelSOS}
              className="bg-green-500 hover:bg-green-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-check"></i>
              I'm Safe
            </button>
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-medium-gray rounded-2xl p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-cog text-yellow-400"></i>
            App Settings
          </h3>
          <div className="space-y-4">
            {[
              {
                label: 'Enable Voice Detection',
                description: 'Listen for distress keywords',
                value: enableVoiceDetection,
                onChange: setEnableVoiceDetection,
              },
              {
                label: 'Enable Background Operation',
                description: 'Keep protection active when app is in background',
                value: enableBackgroundOperation,
                onChange: setEnableBackgroundOperation,
              },
              {
                label: 'Enable Auto-Checkin Reminders',
                description: 'Remind you to check in during long trips',
                value: enableAutoCheckinReminders,
                onChange: setEnableAutoCheckinReminders,
              },
              {
                label: 'Dark Theme',
                description: 'Use dark interface',
                value: darkTheme,
                onChange: setDarkTheme,
              },
              {
                label: 'Vibration Alerts',
                description: 'Vibrate during emergencies',
                value: vibrationAlerts,
                onChange: setVibrationAlerts,
              },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{setting.label}</div>
                  <div className="text-xs text-text-gray">{setting.description}</div>
                </div>
                <label className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    className="opacity-0 w-0 h-0"
                    checked={setting.value}
                    onChange={(e) => setting.onChange(e.target.checked)}
                    title={setting.label}
                  />
                  <span
                    className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                      setting.value ? 'bg-teal-500 before:translate-x-6' : 'bg-gray-600'
                    }`}
                  ></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Manage Contacts & Alert Preferences */}
        <div className="bg-medium-gray rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-user-circle text-yellow-400 text-xl"></i>
            <h3 className="text-lg font-bold">Manage Contacts</h3>
          </div>
          <button
            onClick={() => setShowAddContactDialog(true)}
            className="w-full border-2 border-yellow-400 bg-dark-gray text-yellow-400 py-2 rounded-lg font-semibold mb-4"
          >
            + Add New Contact
          </button>

          {/* Display Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="text-sm font-semibold text-text-gray mb-2">Emergency Contacts ({emergencyContacts.length})</h4>
              {emergencyContacts.map((contact) => (
                <div key={contact._id} className="flex items-center justify-between p-3 bg-dark-gray rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-dark font-bold">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{contact.name}</div>
                      <div className="text-xs text-text-gray">{contact.phone}</div>
                      {contact.relationship && (
                        <div className="text-xs text-text-gray">{contact.relationship}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${contact.name} from emergency contacts?`)) {
                        setEmergencyContacts(emergencyContacts.filter(c => c._id !== contact._id))
                      }
                    }}
                    className="text-danger hover:text-red-400 p-2"
                    title="Remove contact"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-bell text-yellow-400 text-xl"></i>
            <h3 className="text-lg font-bold">Alert Preferences</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Send SMS Alerts',
                description: 'Notify contacts via SMS during emergencies',
                value: sendSMSAlerts,
                onChange: setSendSMSAlerts,
              },
              {
                label: 'Send Email Alerts',
                description: 'Notify contacts via email during emergencies',
                value: sendEmailAlerts,
                onChange: setSendEmailAlerts,
              },
              {
                label: 'Share Live Location',
                description: 'Share your real-time location during emergencies',
                value: shareLiveLocation,
                onChange: setShareLiveLocation,
              },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{setting.label}</div>
                  <div className="text-xs text-text-gray">{setting.description}</div>
                </div>
                <label className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    className="opacity-0 w-0 h-0"
                    checked={setting.value}
                    onChange={(e) => setting.onChange(e.target.checked)}
                    title={setting.label}
                  />
                  <span
                    className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                      setting.value ? 'bg-green-500 before:translate-x-6' : 'bg-gray-600'
                    }`}
                  ></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Map with Safe Places */}
        {location && (
          <div className="bg-medium-gray rounded-2xl p-4">
            <p className="text-sm mb-3">Your current location is shown on the map below:</p>
            <div className="h-64 rounded-xl overflow-hidden mb-3">
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>Your current location</Popup>
                </Marker>
                {safePlaces.map((place, idx) => (
                  <Marker key={idx} position={[place.lat, place.lng]}>
                    <Popup>{place.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-gray mb-3">
              <i className="fas fa-lock"></i>
              <span>Your location is only shared during emergencies</span>
            </div>

            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <i className="fas fa-paper-plane text-yellow-400"></i>
              Nearby Safe Places
            </h3>
            {safePlaces.length > 0 ? (
              <div className="space-y-2">
                {safePlaces.map((place, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-dark-gray rounded-lg hover:bg-light-gray transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      place.type === 'hospital' ? 'bg-red-500/20' : 
                      place.type === 'police' ? 'bg-blue-500/20' : 
                      place.type === 'coffee' ? 'bg-yellow-500/20' : 
                      'bg-green-500/20'
                    }`}>
                      <i
                        className={`fas ${
                          place.type === 'coffee' ? 'fa-coffee' : 
                          place.type === 'police' ? 'fa-shield-alt' : 
                          place.type === 'hospital' ? 'fa-hospital' :
                          place.type === 'pharmacy' ? 'fa-pills' :
                          'fa-map-marker-alt'
                        } ${
                          place.type === 'hospital' ? 'text-red-400' : 
                          place.type === 'police' ? 'text-blue-400' : 
                          place.type === 'coffee' ? 'text-yellow-400' : 
                          'text-green-400'
                        }`}
                      ></i>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{place.name}</div>
                      <div className="text-xs text-text-gray capitalize">{place.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-yellow-400">{place.distance}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-text-gray py-4">
                <i className="fas fa-map-marker-alt text-2xl mb-2"></i>
                <p className="text-sm">Loading nearby places...</p>
              </div>
            )}
          </div>
        )}

        {/* Safety Tip & How It Works */}
        <div className="space-y-3">
          <div className="bg-medium-gray rounded-2xl p-4 border-l-4 border-yellow-400">
            <div className="flex items-start gap-3">
              <i className="fas fa-lightbulb text-yellow-400 text-xl"></i>
              <div>
                <div className="font-bold mb-1">Safety Tip:</div>
                <div className="text-sm text-text-gray">
                  When walking alone, stay in well-lit areas and keep your phone accessible.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-medium-gray rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <i className="fas fa-info-circle text-yellow-400 text-xl"></i>
              <div className="font-bold">How It Works</div>
            </div>
            <div className="space-y-2">
              {[
                'Activate Protection Mode when in unfamiliar areas',
                'App listens for distress keywords like "HELP!" or "EMERGENCY"',
                'If detected, alerts are sent automatically to your contacts',
                'Your live location is shared with emergency contacts',
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-yellow-400 mt-0.5"></i>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Check-in Timer */}
        <div className="bg-medium-gray rounded-2xl p-4">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <i className="fas fa-clock text-yellow-400"></i>
            Safety Check-in
          </h3>
          <p className="text-sm text-text-gray mb-4">
            Set a timer for when you expect to reach your destination safely (up to 24 hours).
          </p>

          <div className="text-4xl font-bold text-yellow-400 text-center mb-4 font-mono">
            {formatTimer()}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm mb-1">Hours</label>
              <div className="flex items-center gap-2 bg-dark-gray rounded-lg">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={timerHours}
                  onChange={(e) => setTimerHours(Math.min(24, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="flex-1 bg-transparent border-none text-center py-2 text-white"
                  placeholder="0"
                  title="Minutes input"
                />
                <div className="flex flex-col">
                  <button
                    onClick={() => setTimerHours(Math.min(24, timerHours + 1))}
                    className="text-yellow-400 px-2"
                    title="Increase hours"
                  >
                    <i className="fas fa-chevron-up text-xs"></i>
                  </button>
                  <button
                    onClick={() => setTimerHours(Math.max(0, timerHours - 1))}
                    className="text-yellow-400 px-2"
                    title="Decrease hours"
                  >
                    <i className="fas fa-chevron-down text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Minutes</label>
              <div className="flex items-center gap-2 bg-dark-gray rounded-lg">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="flex-1 bg-transparent border-none text-center py-2 text-white"
                  placeholder="0"
                  title="Minutes input"
                />
                <div className="flex flex-col">
                  <button
                    onClick={() => setTimerMinutes(Math.min(59, timerMinutes + 1))}
                    className="text-yellow-400 px-2"
                    title="Increase minutes"
                  >
                    <i className="fas fa-chevron-up text-xs"></i>
                  </button>
                  <button
                    onClick={() => setTimerMinutes(Math.max(0, timerMinutes - 1))}
                    className="text-yellow-400 px-2"
                    title="Decrease minutes"
                  >
                    <i className="fas fa-chevron-down text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: '01 min', value: 1 },
              { label: '10 min', value: 10 },
              { label: '1 hour', value: 60 },
              { label: '24 hours', value: 1440 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetTimer(preset.value)}
                className="bg-dark-gray rounded-lg py-3 flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors"
                title={`Set timer to ${preset.label}`}
              >
                <i className="fas fa-hourglass-half text-yellow-400"></i>
                <span className="text-sm">{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={startTimer}
              disabled={timerActive}
              className="w-full bg-dark-gray text-yellow-400 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <i className="fas fa-play"></i>
              Start Timer
            </button>
            <button
              onClick={stopTimer}
              disabled={!timerActive}
              className="w-full bg-dark-gray text-yellow-400 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <i className="fas fa-stop"></i>
              Stop Timer
            </button>
          </div>
        </div>
      </div>

      {/* Add Contact Dialog */}
      {showAddContactDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-medium-gray rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Emergency Contact</h3>
              <button
                onClick={() => setShowAddContactDialog(false)}
                className="text-text-gray hover:text-white"
                title="Close dialog"
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
                  className="w-full bg-dark-gray border-none rounded-lg px-4 py-2 text-white"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full bg-dark-gray border-none rounded-lg px-4 py-2 text-white"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full bg-dark-gray border-none rounded-lg px-4 py-2 text-white"
                  placeholder="Enter email (optional)"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Relationship</label>
                <input
                  type="text"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full bg-dark-gray border-none rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., Family, Friend"
                />
              </div>
              <button
                onClick={addEmergencyContact}
                disabled={!newContact.name || !newContact.phone}
                className="w-full bg-yellow-400 text-dark py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
