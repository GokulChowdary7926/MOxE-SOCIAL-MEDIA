import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSocket } from '../hooks/useSocket'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import api from '../services/api'
import StoryViewer from '../components/feed/StoryViewer'
import MapControls from '../components/map/MapControls'
import VoiceCommands from '../components/map/VoiceCommands'
import PlacesLibrary from '../components/map/PlacesLibrary'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

function TrafficLayer({ enabled }: { enabled: boolean }) {
  const map = useMap()
  const layerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    if (enabled && !layerRef.current) {
      // Traffic layer overlay
      layerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.3,
        zIndex: 1000,
      }).addTo(map)
    } else if (!enabled && layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
  }, [enabled, map])

  return null
}

interface FriendLocation {
  _id: string
  profile: {
    fullName: string
    username: string
    avatar?: string
  }
  location: {
    latitude: number
    longitude: number
  }
  hasStory: boolean
  storyCount: number
  isOnline: boolean
  lastSeen: string
  subscription?: {
    tier: string
  }
  accountType?: string
}

export default function SnapMap() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060])
  const [friends, setFriends] = useState<FriendLocation[]>([])
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null)
  const [viewingStories, setViewingStories] = useState<any[]>([])
  const [storyIndex, setStoryIndex] = useState(0)
  const [mapZoom, setMapZoom] = useState(13)
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard')
  const [trafficEnabled, setTrafficEnabled] = useState(false)
  const [showHeatMap, setShowHeatMap] = useState(false)
  const [showPlacesLibrary, setShowPlacesLibrary] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [locationSharing, setLocationSharing] = useState(true)
  const [privacyMode, setPrivacyMode] = useState<'all' | 'friends' | 'none'>('friends')

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(loc)
          
          try {
            await api.post('/location/update', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              isSharing: locationSharing,
            })
            loadFriends()
          } catch (error) {
            console.error('Failed to update location:', error)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [locationSharing])

  // Load friends with locations
  const loadFriends = useCallback(async () => {
    try {
      const response = await api.get('/location/nearby-users?radius=50000')
      const users = response.data.nearbyUsers || []
      
      // Filter based on privacy mode
      let filteredUsers = users
      if (privacyMode === 'friends') {
        // Only show friends (users you follow)
        try {
          const followersResponse = await api.get('/users/followers')
          // The endpoint returns both followers and following
          const following = followersResponse.data.following || []
          const followingIds = following.map((f: any) => {
            // Handle both populated and non-populated formats
            return f._id ? f._id.toString() : f.toString()
          })
          filteredUsers = users.filter((u: any) => followingIds.includes(u._id?.toString()))
        } catch (error) {
          console.error('Failed to load following list:', error)
          // If endpoint fails, show all users as fallback
          filteredUsers = users
        }
      } else if (privacyMode === 'none') {
        filteredUsers = []
      }

      // Load story info for each friend
      const friendsWithStories = await Promise.all(
        filteredUsers.map(async (user: any) => {
          try {
            const storiesResponse = await api.get(`/stories/user/${user._id}`)
            const stories = storiesResponse.data.stories || []
            return {
              _id: user._id,
              profile: user.profile,
              location: user.location,
              hasStory: stories.length > 0,
              storyCount: stories.length,
              isOnline: user.isOnline || false,
              lastSeen: user.lastSeen || new Date().toISOString(),
              subscription: user.subscription,
              accountType: user.accountType,
              stories: stories,
            }
          } catch {
            return {
              _id: user._id,
              profile: user.profile,
              location: user.location,
              hasStory: false,
              storyCount: 0,
              isOnline: user.isOnline || false,
              lastSeen: user.lastSeen || new Date().toISOString(),
              subscription: user.subscription,
              accountType: user.accountType,
              stories: [],
            }
          }
        })
      )
      
      setFriends(friendsWithStories)
    } catch (error) {
      console.error('Failed to load friends:', error)
    }
  }, [privacyMode])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  // Real-time location updates
  useEffect(() => {
    if (!isConnected || !socket) return

    const handleLocationUpdate = (data: any) => {
      if (data.location?.latitude && data.location?.longitude) {
        loadFriends()
      }
    }

    socket.on('location_updated', handleLocationUpdate)

    return () => {
      socket.off('location_updated', handleLocationUpdate)
    }
  }, [isConnected, socket, loadFriends])

  // Create MOXE Map-style avatar icon
  const createMoxeAvatar = (friend: FriendLocation, isSelected: boolean = false) => {
    const size = isSelected ? 60 : 50
    const borderColor = friend.hasStory 
      ? '#FFFC00' // Yellow for story
      : friend.isOnline
      ? '#00FF00' // Green for online
      : '#CCCCCC' // Gray for offline
    
    const tierColor = friend.subscription?.tier === 'star' 
      ? '#FFD700' 
      : friend.accountType === 'business'
      ? '#FF4D8D'
      : '#6A11CB'

    return L.divIcon({
      className: 'moxe-avatar-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isSelected ? '4px' : '3px'} solid ${borderColor};
          background: linear-gradient(135deg, ${tierColor}, ${tierColor}dd);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${size * 0.4}px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        ">
          ${friend.profile.avatar ? 
            `<img src="${friend.profile.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` :
            friend.profile.fullName.charAt(0).toUpperCase()
          }
          ${friend.hasStory ? `
            <div style="
              position: absolute;
              top: -2px;
              right: -2px;
              width: 16px;
              height: 16px;
              background: #FFFC00;
              border-radius: 50%;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="font-size: 10px;">📸</span>
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  const handleFriendClick = (friend: FriendLocation) => {
    setSelectedFriend(friend)
    if (friend.hasStory && (friend as any).stories) {
      setViewingStories((friend as any).stories)
      setStoryIndex(0)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      const data = await response.json()
      setSearchResults(
        data.map((item: any) => ({
          name: item.display_name.split(',')[0],
          address: item.display_name,
          coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        }))
      )
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const handlePlaceSelect = (place: any) => {
    const loc: [number, number] = [place.coordinates.lat, place.coordinates.lng]
    setUserLocation(loc)
    setMapZoom(15)
    setSearchQuery('')
    setSearchResults([])
  }

  // Calculate heat map data (activity density)
  const calculateHeatMap = () => {
    const heatPoints: Array<{ lat: number; lng: number; intensity: number }> = []
    
    friends.forEach(friend => {
      if (friend.location) {
        heatPoints.push({
          lat: friend.location.latitude,
          lng: friend.location.longitude,
          intensity: friend.hasStory ? 2 : friend.isOnline ? 1.5 : 1,
        })
      }
    })

    return heatPoints
  }

  const heatMapData = showHeatMap ? calculateHeatMap() : []

  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm p-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/map')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-white font-bold text-lg">MOXE Map</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlacesLibrary(true)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <i className="fas fa-bookmark"></i>
          </button>
          <button
            onClick={() => setLocationSharing(!locationSharing)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              locationSharing ? 'bg-primary' : 'bg-white/10'
            } text-white`}
          >
            <i className="fas fa-location-arrow"></i>
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 pt-14">
        <MapContainer
          center={userLocation}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          dragging={true}
        >
          <TileLayer
            url={
              mapType === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : mapType === 'terrain'
                ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={
              mapType === 'satellite'
                ? '&copy; Esri'
                : mapType === 'terrain'
                ? '&copy; OpenTopoMap'
                : '&copy; OpenStreetMap'
            }
          />
          <TrafficLayer enabled={trafficEnabled} />
          <MapController center={userLocation} zoom={mapZoom} />

          {/* Heat Map Circles */}
          {heatMapData.map((point, index) => (
            <Circle
              key={index}
              center={[point.lat, point.lng]}
              radius={point.intensity * 500}
              pathOptions={{
                fillColor: point.intensity > 1.5 ? '#FFFC00' : '#00FF00',
                fillOpacity: 0.3,
                color: point.intensity > 1.5 ? '#FFFC00' : '#00FF00',
                weight: 2,
              }}
            />
          ))}

          {/* User Location */}
          <Marker position={userLocation} icon={createMoxeAvatar({
            _id: user?._id || '',
            profile: { fullName: user?.profile?.fullName || 'You', username: user?.profile?.username || 'you' },
            location: { latitude: userLocation[0], longitude: userLocation[1] },
            hasStory: false,
            storyCount: 0,
            isOnline: true,
            lastSeen: new Date().toISOString(),
          })}>
            <Popup>
              <div className="text-center">
                <strong>You</strong>
              </div>
            </Popup>
          </Marker>

          {/* Friends */}
          {friends.map((friend) => (
            <Marker
              key={friend._id}
              position={[friend.location.latitude, friend.location.longitude]}
              icon={createMoxeAvatar(friend, selectedFriend?._id === friend._id)}
              eventHandlers={{
                click: () => handleFriendClick(friend),
              }}
            >
              <Popup>
                <div className="text-center min-w-[120px]">
                  <strong>{friend.profile.fullName}</strong>
                  {friend.hasStory && (
                    <div className="mt-1">
                      <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                        {friend.storyCount} {friend.storyCount === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-600">
                    {friend.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Search Results */}
          {searchResults.map((result, index) => (
            <Marker
              key={index}
              position={[result.coordinates.lat, result.coordinates.lng]}
              icon={L.divIcon({
                className: 'search-marker',
                html: `<div style="
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  background: #4285f4;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 16px;
                ">📍</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              })}
            >
              <Popup>
                <div>
                  <strong>{result.name}</strong>
                  <br />
                  <span className="text-xs text-gray-600">{result.address}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 space-y-2">
        {/* Search Bar */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 flex items-center gap-2">
          <i className="fas fa-search text-gray-500"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search places..."
            className="flex-1 bg-transparent text-gray-900 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
              }}
              className="text-gray-500"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <MapControls
              onTrafficToggle={setTrafficEnabled}
              onMapTypeChange={setMapType}
              onNavigationModeChange={() => {}}
              trafficEnabled={trafficEnabled}
              mapType={mapType}
              navigationMode="driving"
            />
            <button
              onClick={() => setShowHeatMap(!showHeatMap)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                showHeatMap ? 'bg-primary' : 'bg-white/90 backdrop-blur-sm'
              }`}
            >
              <i className={`fas fa-fire ${showHeatMap ? 'text-white' : 'text-gray-700'}`}></i>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude])
                    setMapZoom(15)
                  })
                }
              }}
              className="w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center"
            >
              <i className="fas fa-crosshairs text-gray-700"></i>
            </button>
            <VoiceCommands onCommand={() => {}} />
          </div>
        </div>

        {/* Privacy Mode Selector */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 flex items-center gap-2">
          <span className="text-xs text-gray-700 font-semibold">Show:</span>
          <select
            value={privacyMode}
            onChange={(e) => setPrivacyMode(e.target.value as any)}
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
          >
            <option value="all">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* Friend Info Panel */}
      {selectedFriend && (
        <div className="absolute top-20 left-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                {selectedFriend.profile.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold">{selectedFriend.profile.fullName}</h3>
                <p className="text-xs text-gray-600">
                  {selectedFriend.isOnline ? 'Online' : `Last seen ${new Date(selectedFriend.lastSeen).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFriend(null)}
              className="text-gray-500"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          {selectedFriend.hasStory && (
            <button
              onClick={() => {
                if ((selectedFriend as any).stories) {
                  setViewingStories((selectedFriend as any).stories)
                  setStoryIndex(0)
                }
              }}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-play"></i>
              <span>View {selectedFriend.storyCount} {selectedFriend.storyCount === 1 ? 'Story' : 'Stories'}</span>
            </button>
          )}
        </div>
      )}

      {/* Story Viewer */}
      {viewingStories.length > 0 && (
        <StoryViewer
          stories={viewingStories}
          initialIndex={storyIndex}
          onClose={() => {
            setViewingStories([])
            setStoryIndex(0)
          }}
        />
      )}

      {/* Places Library */}
      {showPlacesLibrary && (
        <PlacesLibrary
          onPlaceSelect={(place) => {
            setUserLocation([place.coordinates.lat, place.coordinates.lng])
            setMapZoom(15)
            setShowPlacesLibrary(false)
          }}
          onClose={() => setShowPlacesLibrary(false)}
        />
      )}
    </div>
  )
}

