import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SOSButton from '../components/map/SOSButton'
import ProximityAlert from '../components/common/ProximityAlert'
import NearbyMessageHandler from '../components/map/NearbyMessageHandler'
import { useSocket } from '../hooks/useSocket'
import api from '../services/api'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 15)
  }, [map, center])
  return null
}

export default function Map() {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const [userLocation, setUserLocation] = useState<[number, number]>([20.5937, 78.9629])
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([])
  const [isProximityEnabled, setIsProximityEnabled] = useState(true)
  const [proximityAlert, setProximityAlert] = useState<{ userName: string; distance: string } | null>(null)
  const [proximitySettings, setProximitySettings] = useState({
    radius: 5000, // meters
    alertFrequency: 'immediate', // 'immediate', 'periodic', 'once'
    onlyTrustedContacts: false,
    soundEnabled: true,
    vibrationEnabled: true,
    showOnMap: true,
  })
  const [trustedContacts, setTrustedContacts] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    loadTrustedContacts()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings')
      const settings = response.data
      setIsProximityEnabled(settings.proximityAlerts?.enabled || false)
      
      // Load proximity settings if available
      if (settings.proximityAlerts) {
        setProximitySettings(prev => ({
          ...prev,
          ...settings.proximityAlerts,
        }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadTrustedContacts = async () => {
    try {
      const response = await api.get('/users/trusted-contacts')
      const contacts = response.data.trustedContacts || response.data || []
      // Fetch additional info for each contact
      const contactsWithInfo = await Promise.all(
        contacts.map(async (contact: any) => {
          const userId = contact.user?._id || contact.user || contact._id
          try {
            const userResponse = await api.get(`/users/${userId}`)
            return {
              ...contact,
              user: userResponse.data.user || userResponse.data,
              lastNearby: contact.lastNearby || contact.lastSeen || null,
            }
          } catch {
            return contact
          }
        })
      )
      setTrustedContacts(contactsWithInfo)
    } catch (error) {
      console.error('Failed to load trusted contacts:', error)
    }
  }

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return
    
    try {
      const response = await api.get(`/search/users?q=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
      alert('Failed to search users')
    }
  }

  const handleAddTrustedContact = async (userId: string) => {
    if (trustedContacts.length >= 5) {
      alert('Maximum 5 trusted contacts allowed')
      return
    }
    
    try {
      await api.post('/users/trusted-contacts', { userId })
      await loadTrustedContacts()
      setSearchQuery('')
      setSearchResults([])
      setShowAddContact(false)
      alert('Trusted contact added successfully!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add trusted contact')
    }
  }

  const handleRemoveTrustedContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this trusted contact?')) return
    
    try {
      await api.delete(`/users/trusted-contacts/${contactId}`)
      await loadTrustedContacts()
      alert('Trusted contact removed successfully!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to remove trusted contact')
    }
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(loc)
          
          // Update location on server
          try {
            await api.post('/location/update', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              isSharing: true,
            })
            
            // Load nearby users
            loadNearbyUsers(position.coords.latitude, position.coords.longitude)
          } catch (error) {
            console.error('Failed to update location:', error)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [])

  const loadNearbyUsers = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await api.get(`/location/nearby-users?radius=${proximitySettings.radius}`)
      let users = response.data.nearbyUsers || []
      
      // Filter by trusted contacts if enabled
      if (proximitySettings.onlyTrustedContacts && trustedContacts.length > 0) {
        const trustedIds = trustedContacts.map((tc: any) => tc.user?._id || tc.user)
        users = users.filter((user: any) => trustedIds.includes(user._id))
      }
      
      setNearbyUsers(users)
      
      // Show proximity alert for nearby users based on frequency
      if (isProximityEnabled && users.length > 0) {
        const closestUser = users[0]
        if (closestUser.distance) {
          // Immediate alerts
          if (proximitySettings.alertFrequency === 'immediate') {
            setProximityAlert({
              userName: closestUser.profile?.fullName || 'User',
              distance: closestUser.distance,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to load nearby users:', error)
    }
  }, [isProximityEnabled, proximitySettings.radius, proximitySettings.onlyTrustedContacts, proximitySettings.alertFrequency, trustedContacts])
  
  // Real-time socket events for Map
  useEffect(() => {
    if (!isConnected || !socket) return

    // Location updates
    const handleLocationUpdate = (data: any) => {
      if (data.location?.latitude && data.location?.longitude) {
        loadNearbyUsers(data.location.latitude, data.location.longitude)
      }
    }

    socket.on('location_updated', handleLocationUpdate)

    // SOS alerts
    socket.on('sos_alert', (data: any) => {
      // Show alert notification
      alert(`🚨 SOS Alert: ${data.userName} needs help!`)
    })

    socket.on('sos_cancelled', (data: any) => {
      // Handle SOS cancellation
      console.log('SOS cancelled:', data)
    })

    // Proximity alerts
    socket.on('proximity_alert_received', (data: any) => {
      setProximityAlert({
        userName: data.username || 'User',
        distance: data.distance || 'nearby',
      })
    })

    // Nearby messages
    socket.on('nearby_message_received', (data: any) => {
      // Show nearby message notification
      console.log('📍 Nearby message:', data)
    })

    return () => {
      socket.off('location_updated', handleLocationUpdate)
      socket.off('sos_alert')
      socket.off('sos_cancelled')
      socket.off('proximity_alert_received')
      socket.off('nearby_message_received')
    }
  }, [isConnected, socket, loadNearbyUsers])

  // Periodic check for proximity alerts
  useEffect(() => {
    if (!isProximityEnabled || proximitySettings.alertFrequency === 'immediate') return
    
    const interval = setInterval(() => {
      if (nearbyUsers.length > 0) {
        if (proximitySettings.alertFrequency === 'periodic') {
          const randomUser = nearbyUsers[Math.floor(Math.random() * nearbyUsers.length)]
          if (randomUser.distance) {
            setProximityAlert({
              userName: randomUser.profile?.fullName || 'User',
              distance: randomUser.distance,
            })
          }
        }
      }
    }, 15000)
    
    return () => clearInterval(interval)
  }, [nearbyUsers, isProximityEnabled, proximitySettings.alertFrequency])

  const createCustomIcon = (color: string, letter: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${letter}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }

  return (
    <div className="p-4 space-y-4">
      {/* Nearby Messaging Handler */}
      <NearbyMessageHandler />
      
      {/* Proximity Alert */}
      {proximityAlert && (
        <ProximityAlert
          userName={proximityAlert.userName}
          distance={proximityAlert.distance}
          onClose={() => setProximityAlert(null)}
        />
      )}

      {/* 1. Map Section */}
      <div 
        className="bg-medium-gray rounded-2xl p-4 cursor-pointer hover:bg-light-gray transition-colors"
        onClick={() => navigate('/map/fullscreen')}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-map-marked-alt text-primary-light"></i>
          MOxE Map
        </h3>
        <div className="h-64 rounded-lg overflow-hidden relative">
          <MapContainer
            center={userLocation}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapController center={userLocation} />
            <Marker position={userLocation} icon={createCustomIcon('#6a11cb', 'Y')}>
              <Popup>You are here</Popup>
            </Marker>
            
            {/* Nearby Users Markers */}
            {nearbyUsers.map((user: any, index: number) => {
              if (!user.location?.latitude || !user.location?.longitude) return null
              
              const markerColor = user.subscription?.tier === 'star' 
                ? '#ffd700' 
                : user.accountType === 'business'
                ? '#ff4d8d'
                : '#00c853'
              
              return (
                <Marker
                  key={index}
                  position={[user.location.latitude, user.location.longitude]}
                  icon={createCustomIcon(markerColor, user.profile?.fullName?.charAt(0) || 'U')}
                >
                  <Popup>
                    <div>
                      <strong>{user.profile?.fullName || 'User'}</strong>
                      {user.subscription?.tier === 'star' && (
                        <span className="ml-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
                          PREMIUM
                        </span>
                      )}
                      <br />
                      {user.distance} away
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
          
          <SOSButton />
        </div>
        <div className="mt-2 text-xs text-text-gray flex items-center gap-1">
          <i className="fas fa-expand"></i>
          <span>Tap to view full screen</span>
        </div>
      </div>

      {/* 2. Nearby Messaging Section */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-broadcast-tower text-primary-light"></i>
          Nearby Messaging
        </h3>
        <p className="text-sm text-text-gray mb-4">
          Send messages to users nearby your location.
        </p>
        <button
          onClick={() => navigate('/nearby-messaging')}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
        >
          <i className="fas fa-broadcast-tower"></i>
          <span>Open Nearby Messaging</span>
        </button>
      </div>

      {/* 3. SOS Emergency Section */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-danger"></i>
          SOS Emergency
        </h3>
        <p className="text-sm text-text-gray mb-4">
          Access full SOS features including voice activation, safety timer, and emergency contacts.
        </p>
        <button
          onClick={() => navigate('/sos-emergency')}
          className="w-full bg-danger text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          <i className="fas fa-exclamation-triangle"></i>
          Open SOS Emergency
        </button>
        <button
          onClick={async () => {
            try {
              // Check status first
              const statusResponse = await api.get('/location/sos-status')
              if (statusResponse.data.isActive) {
                // Cancel if active
                await api.post('/location/sos-cancel')
                alert('SOS test cancelled!')
              } else {
                // Activate test
                await api.post('/location/sos-activate', {
                  triggeredBy: 'test',
                })
                alert('SOS test activated! (No alerts sent in test mode)')
              }
            } catch (error: any) {
              console.error('SOS test failed:', error)
              const message = error.response?.data?.message || 'SOS test failed. Please try again.'
              alert(message)
            }
          }}
          className="w-full bg-light-gray text-white py-2 rounded-lg font-semibold hover:bg-medium-gray transition-colors"
        >
          <i className="fas fa-vial mr-2"></i>Test SOS System
        </button>
      </div>

      {/* 4. Proximity Alerts Section */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <i className="fas fa-bell text-primary-light"></i>
          Proximity Alerts
        </h3>
        <p className="text-sm text-text-gray mb-4">
          Your private list of contacts for proximity alerts (up to 5 people).
        </p>
        
        {trustedContacts.length > 0 ? (
          <div className="space-y-3 mb-4">
            {trustedContacts.map((contact: any) => {
              const user = contact.user || contact
              const userId = user._id || contact.user?._id || contact.user
              const isOnline = user.isOnline || false
              const lastNearby = contact.lastNearby 
                ? new Date(contact.lastNearby)
                : null
              
              const getTimeAgo = (date: Date) => {
                const now = new Date()
                const diffMs = now.getTime() - date.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const diffHours = Math.floor(diffMs / 3600000)
                const diffDays = Math.floor(diffMs / 86400000)
                
                if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
                if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
              }
              
              return (
                <div
                  key={contact._id || userId}
                  className="flex items-center gap-3 p-3 bg-dark-gray rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                    {user.profile?.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {user.profile?.fullName || user.username || 'User'}
                      </span>
                      <span className={`text-sm ${isOnline ? 'text-primary-light' : 'text-text-gray'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {lastNearby && (
                      <p className="text-sm text-text-gray">
                        Last nearby: {getTimeAgo(lastNearby)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveTrustedContact(contact._id || userId)}
                    className="text-text-gray hover:text-danger transition-colors"
                    title="Remove contact"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 mb-4">
            <i className="fas fa-users text-4xl text-text-gray opacity-50 mb-3"></i>
            <p className="text-sm text-text-gray">No trusted contacts yet</p>
          </div>
        )}
        
        {showAddContact ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                placeholder="Search username..."
                className="flex-1 bg-dark-gray text-white rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleSearchUsers}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-search"></i>
              </button>
              <button
                onClick={() => {
                  setShowAddContact(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="bg-light-gray text-white px-4 py-2 rounded-lg hover:bg-medium-gray transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {searchResults
                  .filter((user: any) => !trustedContacts.some((tc: any) => 
                    (tc.user?._id || tc.user) === user._id
                  ))
                  .map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-2 bg-dark-gray rounded-lg hover:bg-light-gray transition-colors cursor-pointer"
                      onClick={() => handleAddTrustedContact(user._id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                        {user.profile?.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">
                          {user.profile?.fullName || user.username || 'User'}
                        </span>
                      </div>
                      <i className="fas fa-plus text-primary-light"></i>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (trustedContacts.length >= 5) {
                alert('Maximum 5 trusted contacts allowed')
                return
              }
              setShowAddContact(true)
            }}
            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-plus"></i>
            <span>Add Trusted Contact</span>
          </button>
        )}
      </div>
    </div>
  )
}
