import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSocket } from '../hooks/useSocket'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import api from '../services/api'
import MapControls from '../components/map/MapControls'
import PlacesLibrary from '../components/map/PlacesLibrary'
import VoiceCommands from '../components/map/VoiceCommands'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../utils/constants'

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

export default function FullScreenMap() {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const { user } = useSelector((state: RootState) => state.auth)
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_MAP_CENTER)
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([])
  const [trafficEnabled, setTrafficEnabled] = useState(false)
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard')
  const [navigationMode, setNavigationMode] = useState<'driving' | 'cycling' | 'transit' | 'walking'>('driving')
  const [showPlacesLibrary, setShowPlacesLibrary] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM)
  const [isSharingLocation, setIsSharingLocation] = useState(false)
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [weather, setWeather] = useState<{ temp: number; aqi: number; condition: string } | null>(null)
  const [currentLocationName, setCurrentLocationName] = useState<string>('Dharapadavedu')
  const [isFullHD, setIsFullHD] = useState<boolean>(false)

  // Prevent body scroll when fullscreen map is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Detect Full HD or larger screens and adjust layout
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setIsFullHD(w >= 1920 && h >= 1080)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
              isSharing: isSharingLocation,
            })
            
            // Load nearby users
            loadNearbyUsers(position.coords.latitude, position.coords.longitude)
            
            // Load weather (mock for now)
            setWeather({
              temp: 26,
              aqi: 97,
              condition: 'partly-cloudy',
            })
          } catch (error) {
            console.error('Failed to update location:', error)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [isSharingLocation])

  const loadNearbyUsers = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await api.get('/location/nearby-users?radius=5000')
      const users = response.data.nearbyUsers || []
      setNearbyUsers(users)
    } catch (error) {
      console.error('Failed to load nearby users:', error)
    }
  }, [])

  const loadSavedPlaces = useCallback(async () => {
    try {
      const response = await api.get('/location/saved-places')
      setSavedPlaces(response.data.savedPlaces || [])
    } catch (error) {
      console.error('Failed to load saved places:', error)
    }
  }, [])

  useEffect(() => {
    loadSavedPlaces()
  }, [loadSavedPlaces])

  // Real-time location updates
  useEffect(() => {
    if (!isConnected || !socket) return

    const handleLocationUpdate = (data: any) => {
      if (data.location?.latitude && data.location?.longitude) {
        loadNearbyUsers(data.location.latitude, data.location.longitude)
      }
    }

    socket.on('location_updated', handleLocationUpdate)

    return () => {
      socket.off('location_updated', handleLocationUpdate)
    }
  }, [isConnected, socket, loadNearbyUsers])

  const createCustomIcon = (color: string, letter: string, hasPulse: boolean = false) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          position: relative;
          background: ${color};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 1000;
        ">
          ${letter}
          ${hasPulse ? `
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 2px solid ${color};
              animation: pulse 2s infinite;
              z-index: -1;
            "></div>
          ` : ''}
        </div>
        <style>
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(2);
              opacity: 0;
            }
          }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        setSearchResults(
          data.map((item: any) => ({
            name: item.display_name.split(',')[0],
            address: item.display_name,
            coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
            rating: item.importance * 5,
          }))
        )
      })
      .catch((error) => {
        console.error('Search error:', error)
        alert('Failed to search places')
      })
  }

  const handlePlaceSelect = (place: any) => {
    const loc: [number, number] = [place.coordinates.lat, place.coordinates.lng]
    setUserLocation(loc)
    setMapZoom(15)
    setSearchQuery('')
    setSearchResults([])
    setCurrentLocationName(place.name || place.address?.split(',')[0] || 'Current Location')
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }

  // Reverse geocode to get location name
  useEffect(() => {
    const reverseGeocode = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation[0]}&lon=${userLocation[1]}&zoom=18&addressdetails=1`
        )
        const data = await response.json()
        if (data.address) {
          const name = data.address.village || 
                      data.address.town || 
                      data.address.city || 
                      data.address.county || 
                      data.display_name?.split(',')[0] || 
                      'Current Location'
          setCurrentLocationName(name)
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error)
      }
    }
    reverseGeocode()
  }, [userLocation])

  const handleShareLocation = async () => {
    setIsSharingLocation(!isSharingLocation)
    try {
      await api.post('/location/update', {
        latitude: userLocation[0],
        longitude: userLocation[1],
        isSharing: !isSharingLocation,
      })
    } catch (error) {
      console.error('Failed to update location sharing:', error)
    }
  }

  const handleMarkLocation = async () => {
    const name = prompt('Enter a name for this location:')
    if (!name) return

    try {
      await api.post('/location/saved-places', {
        name,
        address: searchQuery || 'Current Location',
        coordinates: {
          lat: userLocation[0],
          lng: userLocation[1],
        },
        type: 'place',
      })
      loadSavedPlaces()
      alert('Location saved successfully!')
    } catch (error) {
      console.error('Failed to save location:', error)
      alert('Failed to save location')
    }
  }

  const quickPlaces = savedPlaces.slice(0, 4)
  const placeCount = savedPlaces.length
  const guideCount = savedPlaces.filter((p: any) => p.type === 'guide').length
  const routeCount = savedPlaces.filter((p: any) => p.type === 'route').length

  return (
    <div 
      className="fixed inset-0 z-50 bg-dark-gray" 
      style={{ 
        touchAction: 'pan-x pan-y pinch-zoom',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
        position: 'fixed',
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        minWidth: isFullHD ? '1920px' as any : undefined,
        minHeight: isFullHD ? '1080px' as any : undefined,
      }}
    >
      {/* Map View - Top 2/3 */}
      <div 
        className="absolute top-0 left-0 right-0" 
        style={{ 
          height: isFullHD ? '75%' : '66.67%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <MapContainer
          center={userLocation}
          zoom={mapZoom}
          style={{ 
            height: '100%', 
            width: '100%',
            touchAction: 'pan-x pan-y pinch-zoom',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
            position: 'relative',
          }}
          className="rounded-none"
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={true}
          dragging={true}
          zoomSnap={0.5}
          zoomDelta={1}
          maxZoom={18}
          minZoom={3}
          preferCanvas={true}
          attributionControl={true}
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
                ? '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                : mapType === 'terrain'
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
          />
          <TrafficLayer enabled={trafficEnabled} />
          <MapController center={userLocation} zoom={mapZoom} />
          
          {/* User Location Marker with Pulse */}
          <Marker position={userLocation} icon={createCustomIcon('#4285f4', 'Y', true)}>
            <Popup>
              <div className="text-sm">
                <strong>You are here</strong>
              </div>
            </Popup>
          </Marker>
          
          {/* Location Name Below Marker */}
          <div 
            className="absolute z-30"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, calc(-50% + 30px))',
              pointerEvents: 'none',
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg">
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {currentLocationName}
              </span>
            </div>
          </div>
          
          {/* Nearby Users Markers */}
          {nearbyUsers.map((user: any, index: number) => {
            if (!user.location?.latitude || !user.location?.longitude) return null
            
            const markerColor = user.subscription?.tier === 'star' 
              ? '#ffd700' 
              : user.subscription?.tier === 'thick'
              ? '#ff4d8d'
              : user.accountType === 'business'
              ? '#9c27b0'
              : '#00c853'
            
            return (
              <Marker
                key={index}
                position={[user.location.latitude, user.location.longitude]}
                icon={createCustomIcon(markerColor, user.profile?.fullName?.charAt(0) || 'U')}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{user.profile?.fullName || 'User'}</strong>
                    {user.subscription?.tier === 'star' && (
                      <span className="ml-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
                        PREMIUM
                      </span>
                    )}
                    <br />
                    <span className="text-xs text-gray-600">{user.distance} away</span>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Map Controls - Top Right (Above Weather) */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
          <button
            onClick={() => setMapType(mapType === 'standard' ? 'satellite' : mapType === 'satellite' ? 'terrain' : 'standard')}
            className={`${isFullHD ? 'w-12 h-12' : 'w-9 h-9'} rounded-lg bg-medium-gray/95 backdrop-blur-sm active:bg-light-gray transition-colors flex items-center justify-center shadow-lg touch-manipulation`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            aria-label="Map type"
          >
            <i className={`fas fa-layer-group text-white ${isFullHD ? 'text-base' : 'text-xs'}`}></i>
          </button>
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
                    setUserLocation(loc)
                    setMapZoom(15)
                    if (navigator.vibrate) {
                      navigator.vibrate(100)
                    }
                  }
                )
              }
            }}
            className={`${isFullHD ? 'w-12 h-12' : 'w-9 h-9'} rounded-lg bg-medium-gray/95 backdrop-blur-sm active:bg-light-gray transition-colors flex items-center justify-center shadow-lg touch-manipulation`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            aria-label="Compass"
          >
            <i className={`fas fa-compass text-white ${isFullHD ? 'text-base' : 'text-xs'}`}></i>
          </button>
        </div>

        {/* Weather Info - Top Right (Below Controls) */}
        {weather && (
          <div className={`absolute ${isFullHD ? 'top-16' : 'top-14'} right-2 z-20 bg-medium-gray/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg`}>
            <div className={`flex items-center gap-2 text-white ${isFullHD ? 'text-sm' : 'text-xs'}`}>
              <i className={`fas fa-${weather.condition === 'partly-cloudy' ? 'cloud-sun' : 'sun'} ${isFullHD ? 'text-sm' : 'text-xs'}`}></i>
              <span className="font-semibold">{weather.temp}°</span>
              <span className="text-text-gray">•</span>
              <span>AQI {weather.aqi}</span>
              <div className={`w-2 h-2 rounded-full ${weather.aqi < 50 ? 'bg-green-500' : weather.aqi < 100 ? 'bg-yellow-500' : 'bg-orange-500'}`}></div>
            </div>
          </div>
        )}

        {/* Close Button - Top Left */}
        <button
          onClick={() => navigate('/map')}
          className="absolute top-2 left-2 z-20 w-10 h-10 rounded-full bg-medium-gray/95 backdrop-blur-sm active:bg-light-gray transition-colors flex items-center justify-center shadow-lg touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          aria-label="Close map"
        >
          <i className="fas fa-arrow-left text-white text-sm"></i>
        </button>
      </div>

      {/* Bottom UI Section - Bottom 1/3 */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-medium-gray rounded-t-3xl z-30"
        style={{ 
          height: isFullHD ? '25%' : '33.33%',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 16px)',
          paddingRight: 'env(safe-area-inset-right, 16px)',
          paddingTop: isFullHD ? '16px' : '12px',
        }}
      >
        {/* Handle Bar */}
        <div className={`flex justify-center ${isFullHD ? 'mb-4' : 'mb-3'}`}>
          <div className={`${isFullHD ? 'w-16 h-1.5' : 'w-12 h-1'} bg-light-gray/40 rounded-full`}></div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="bg-dark-gray rounded-xl px-4 py-3 flex items-center gap-3">
            <i className={`fas fa-search text-text-gray ${isFullHD ? 'text-base' : 'text-sm'}`}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Q Search Maps"
              className={`flex-1 bg-transparent text-white ${isFullHD ? 'text-base' : 'text-sm'} placeholder-text-gray outline-none`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <VoiceCommands onCommand={(cmd, params) => {
              if (cmd === 'search' && params?.query) {
                setSearchQuery(params.query)
                setTimeout(handleSearch, 100)
              }
            }} />
            <button
              onClick={() => setShowPlacesLibrary(true)}
              className={`${isFullHD ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs'} rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold touch-manipulation`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              GB
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className={`mt-2 bg-dark-gray rounded-xl ${isFullHD ? 'max-h-48' : 'max-h-32'} overflow-y-auto`}>
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handlePlaceSelect(result)}
                  className="w-full p-3 text-left active:bg-light-gray/20 transition-colors border-b border-light-gray/10 last:border-0"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <div className={`font-semibold text-white ${isFullHD ? 'text-base' : 'text-sm'}`}>{result.name}</div>
                  <div className={`${isFullHD ? 'text-sm' : 'text-xs'} text-text-gray mt-1 line-clamp-1`}>{result.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Library Section */}
        <div className="mb-4">
          <h3 className="text-white font-semibold text-sm mb-3">Library</h3>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Home */}
            <button
              onClick={() => {
                const home = savedPlaces.find((p: any) => p.name?.toLowerCase().includes('home'))
                if (home) {
                  setUserLocation([home.coordinates.lat, home.coordinates.lng])
                  setMapZoom(15)
                } else {
                  setShowPlacesLibrary(true)
                }
              }}
              className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <div className={`${isFullHD ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-primary/20 flex items-center justify-center`}>
                <i className={`fas fa-home text-primary ${isFullHD ? 'text-xl' : 'text-lg'}`}></i>
              </div>
              <div className="text-center">
                <div className={`text-white ${isFullHD ? 'text-sm' : 'text-xs'} font-medium`}>Home</div>
                <div className="text-primary text-xs">Add</div>
              </div>
            </button>

            {/* Work */}
            <button
              onClick={() => {
                const work = savedPlaces.find((p: any) => p.name?.toLowerCase().includes('work'))
                if (work) {
                  setUserLocation([work.coordinates.lat, work.coordinates.lng])
                  setMapZoom(15)
                } else {
                  setShowPlacesLibrary(true)
                }
              }}
              className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <div className={`${isFullHD ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-primary/20 flex items-center justify-center`}>
                <i className={`fas fa-briefcase text-primary ${isFullHD ? 'text-xl' : 'text-lg'}`}></i>
              </div>
              <div className="text-center">
                <div className={`text-white ${isFullHD ? 'text-sm' : 'text-xs'} font-medium`}>Work</div>
                <div className="text-primary text-xs">Add</div>
              </div>
            </button>

            {/* Saved Places */}
            {quickPlaces.map((place: any, index: number) => {
              const distance = place.coordinates ? Math.round(
                Math.sqrt(
                  Math.pow(place.coordinates.lat - userLocation[0], 2) +
                  Math.pow(place.coordinates.lng - userLocation[1], 2)
                ) * 111
              ) : 0
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    setUserLocation([place.coordinates.lat, place.coordinates.lng])
                    setMapZoom(15)
                    setCurrentLocationName(place.name || 'Current Location')
                  }}
                  className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                <div className={`${isFullHD ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center`}>
                  <i className={`fas fa-graduation-cap text-white ${isFullHD ? 'text-xl' : 'text-lg'}`}></i>
                  </div>
                  <div className="text-center">
                  <div className={`text-white ${isFullHD ? 'text-sm' : 'text-xs'} font-medium truncate w-16`}>{place.name || 'Place'}</div>
                    {distance > 0 && (
                    <div className={`text-text-gray ${isFullHD ? 'text-sm' : 'text-xs'}`}>{distance} km</div>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Add Place */}
            <button
              onClick={() => setShowPlacesLibrary(true)}
              className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <div className={`${isFullHD ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-light-gray/30 flex items-center justify-center border-2 border-dashed border-text-gray`}>
                <i className={`fas fa-plus text-text-gray ${isFullHD ? 'text-xl' : 'text-lg'}`}></i>
              </div>
              <div className="text-center">
                <div className={`text-text-gray ${isFullHD ? 'text-sm' : 'text-xs'} font-medium`}>Add</div>
              </div>
            </button>
          </div>

          {/* Place Count */}
          <button
            onClick={() => setShowPlacesLibrary(true)}
            className={`mt-3 flex items-center justify-between text-text-gray ${isFullHD ? 'text-sm' : 'text-xs'} w-full touch-manipulation`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <span>{placeCount} Place{placeCount !== 1 ? 's' : ''} • {guideCount} Guide{guideCount !== 1 ? 's' : ''} • {routeCount} Route{routeCount !== 1 ? 's' : ''}</span>
            <i className={`fas fa-chevron-right ${isFullHD ? 'text-sm' : 'text-xs'}`}></i>
          </button>
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-3`}>
          <button
            onClick={handleShareLocation}
            className={`flex-1 ${isFullHD ? 'py-4 text-base' : 'py-3 text-sm'} rounded-xl font-semibold transition-colors touch-manipulation ${
              isSharingLocation
                ? 'bg-primary text-white'
                : 'bg-dark-gray text-primary border border-primary/30'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {isSharingLocation ? 'Stop Sharing' : 'Share My Location'}
          </button>
          <button
            onClick={handleMarkLocation}
            className={`flex-1 ${isFullHD ? 'py-4 text-base' : 'py-3 text-sm'} rounded-xl bg-dark-gray text-primary border border-primary/30 font-semibold hover:bg-primary/10 transition-colors touch-manipulation`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            Mark My Location
          </button>
        </div>
      </div>

      {/* Places Library Modal */}
      {showPlacesLibrary && (
        <PlacesLibrary
          onPlaceSelect={(place) => {
            setUserLocation([place.coordinates.lat, place.coordinates.lng])
            setMapZoom(15)
            setShowPlacesLibrary(false)
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100])
            }
          }}
          onClose={() => setShowPlacesLibrary(false)}
        />
      )}
    </div>
  )
}
