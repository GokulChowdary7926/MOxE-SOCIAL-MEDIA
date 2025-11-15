import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface Place {
  _id?: string
  name: string
  type: string
  category?: string
  rating: number | string
  distance: string | number
  icon?: string
  address?: string
  phone?: string
  hours?: string
  price?: string
  description?: string
  image?: string
  open?: boolean
  coordinates?: {
    lat: number
    lng: number
  }
}

interface UserLocation {
  latitude: number
  longitude: number
}

export default function NearbyPlaces() {
  const navigate = useNavigate()
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const categories = [
    { id: 'all', label: 'All Places', icon: 'fa-map-marker-alt' },
    { id: 'restaurant', label: 'Restaurants', icon: 'fa-utensils' },
    { id: 'cafe', label: 'Cafes', icon: 'fa-coffee' },
    { id: 'shopping', label: 'Shopping', icon: 'fa-shopping-bag' },
    { id: 'attraction', label: 'Attractions', icon: 'fa-landmark' },
  ]

  useEffect(() => {
    getUserLocation()
  }, [])

  // Get user's current location using GPS
  const getUserLocation = () => {
    setIsLoading(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLoading(false)
      // Use fallback location (New York)
      const fallbackLocation = { latitude: 40.7128, longitude: -74.0060 }
      setUserLocation(fallbackLocation)
      loadFamousPlaces(fallbackLocation.latitude, fallbackLocation.longitude)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const location = { latitude, longitude }
        setUserLocation(location)
        console.log('📍 User location detected:', latitude, longitude)
        await loadFamousPlaces(latitude, longitude)
        setIsLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationError('Unable to get your location. Please enable location services.')
        setIsLoading(false)
        // Fallback to major city coordinates (New York)
        const fallbackLocation = { latitude: 40.7128, longitude: -74.0060 }
        setUserLocation(fallbackLocation)
        loadFamousPlaces(fallbackLocation.latitude, fallbackLocation.longitude)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // Load famous places based on user's real GPS location
  const loadFamousPlaces = async (lat: number, lng: number) => {
    try {
      // First try to get places from API
      const response = await api.get('/explore/nearby-places', {
        params: { latitude: lat, longitude: lng }
      })
      if (response.data.places && response.data.places.length > 0) {
        setPlaces(response.data.places)
        return
      }
    } catch (error) {
      console.log('API call failed, using famous landmarks database')
    }

    // Use famous landmarks database based on location
    const famousPlaces = getFamousPlacesByLocation(lat, lng)
    setPlaces(famousPlaces)
  }

  // Get famous places based on approximate location (major cities)
  const getFamousPlacesByLocation = (lat: number, lng: number): Place[] => {
    // Major cities and their famous landmarks
    const cityLandmarks: Record<string, Place[]> = {
      // New York Area (40.7128, -74.0060)
      'ny': [
        {
          name: 'Statue of Liberty',
          type: 'attraction',
          category: 'attraction',
          rating: 4.8,
          distance: calculateDistance(lat, lng, 40.6892, -74.0445),
          icon: 'fa-landmark',
          address: 'Liberty Island, New York, NY 10004',
          phone: '+1 (212) 363-3200',
          hours: '8:30 AM - 4:00 PM',
          price: '$24-25',
          description: 'Iconic neoclassical sculpture on Liberty Island in New York Harbor.',
          image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=300&fit=crop',
          coordinates: { lat: 40.6892, lng: -74.0445 },
          open: true
        },
        {
          name: 'Central Park',
          type: 'attraction',
          category: 'attraction',
          rating: 4.7,
          distance: calculateDistance(lat, lng, 40.7829, -73.9654),
          icon: 'fa-park',
          address: 'New York, NY 10024',
          phone: '+1 (212) 310-6600',
          hours: '6:00 AM - 1:00 AM',
          price: 'Free',
          description: 'Urban park in Manhattan, one of the most visited urban parks in the United States.',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
          coordinates: { lat: 40.7829, lng: -73.9654 },
          open: true
        },
        {
          name: 'Times Square',
          type: 'attraction',
          category: 'attraction',
          rating: 4.3,
          distance: calculateDistance(lat, lng, 40.7580, -73.9855),
          icon: 'fa-landmark',
          address: 'Manhattan, NY 10036',
          phone: '+1 (212) 452-5283',
          hours: '24/7',
          price: 'Free',
          description: 'Major commercial intersection, tourist destination, and entertainment center.',
          image: 'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=400&h=300&fit=crop',
          coordinates: { lat: 40.7580, lng: -73.9855 },
          open: true
        },
        {
          name: 'Empire State Building',
          type: 'attraction',
          category: 'attraction',
          rating: 4.6,
          distance: calculateDistance(lat, lng, 40.7484, -73.9857),
          icon: 'fa-building',
          address: '350 5th Ave, New York, NY 10118',
          phone: '+1 (212) 736-3100',
          hours: '8:00 AM - 2:00 AM',
          price: '$38-48',
          description: '102-story Art Deco skyscraper, an iconic symbol of New York City.',
          image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop',
          coordinates: { lat: 40.7484, lng: -73.9857 },
          open: true
        }
      ],
      // Los Angeles Area (34.0522, -118.2437)
      'la': [
        {
          name: 'Hollywood Sign',
          type: 'attraction',
          category: 'attraction',
          rating: 4.6,
          distance: calculateDistance(lat, lng, 34.1341, -118.3215),
          icon: 'fa-landmark',
          address: 'Los Angeles, CA 90068',
          phone: 'N/A',
          hours: '24/7',
          price: 'Free',
          description: 'American landmark and cultural icon overlooking Hollywood.',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
          coordinates: { lat: 34.1341, lng: -118.3215 },
          open: true
        },
        {
          name: 'Santa Monica Pier',
          type: 'attraction',
          category: 'attraction',
          rating: 4.5,
          distance: calculateDistance(lat, lng, 34.0084, -118.4976),
          icon: 'fa-landmark',
          address: '200 Santa Monica Pier, Santa Monica, CA 90401',
          phone: '+1 (310) 458-8900',
          hours: '24/7',
          price: 'Free',
          description: 'Large double-jointed pier at the foot of Colorado Avenue in Santa Monica.',
          image: 'https://images.unsplash.com/photo-1545583056-648eed67d7a7?w=400&h=300&fit=crop',
          coordinates: { lat: 34.0084, lng: -118.4976 },
          open: true
        },
        {
          name: 'Griffith Observatory',
          type: 'attraction',
          category: 'attraction',
          rating: 4.7,
          distance: calculateDistance(lat, lng, 34.1183, -118.3003),
          icon: 'fa-landmark',
          address: '2800 E Observatory Rd, Los Angeles, CA 90027',
          phone: '+1 (213) 473-0800',
          hours: '10:00 AM - 10:00 PM',
          price: 'Free',
          description: 'Public observatory with planetarium, exhibits, and stunning city views.',
          image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
          coordinates: { lat: 34.1183, lng: -118.3003 },
          open: true
        }
      ],
      // Chicago Area (41.8781, -87.6298)
      'chicago': [
        {
          name: 'Millennium Park',
          type: 'attraction',
          category: 'attraction',
          rating: 4.7,
          distance: calculateDistance(lat, lng, 41.8826, -87.6226),
          icon: 'fa-park',
          address: '201 E Randolph St, Chicago, IL 60602',
          phone: '+1 (312) 742-1168',
          hours: '6:00 AM - 11:00 PM',
          price: 'Free',
          description: 'Public park located in the Loop community area of Chicago.',
          image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop',
          coordinates: { lat: 41.8826, lng: -87.6226 },
          open: true
        },
        {
          name: 'Willis Tower',
          type: 'attraction',
          category: 'attraction',
          rating: 4.4,
          distance: calculateDistance(lat, lng, 41.8789, -87.6359),
          icon: 'fa-building',
          address: '233 S Wacker Dr, Chicago, IL 60606',
          phone: '+1 (312) 875-0066',
          hours: '9:00 AM - 10:00 PM',
          price: '$28-35',
          description: '108-story, 1,450-foot skyscraper in Chicago. Second tallest building in the United States.',
          image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop',
          coordinates: { lat: 41.8789, lng: -87.6359 },
          open: true
        },
        {
          name: 'Navy Pier',
          type: 'attraction',
          category: 'attraction',
          rating: 4.3,
          distance: calculateDistance(lat, lng, 41.8917, -87.6086),
          icon: 'fa-landmark',
          address: '600 E Grand Ave, Chicago, IL 60611',
          phone: '+1 (312) 595-7437',
          hours: '10:00 AM - 8:00 PM',
          price: 'Free',
          description: '3,300-foot-long pier on the Chicago shoreline of Lake Michigan.',
          image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop',
          coordinates: { lat: 41.8917, lng: -87.6086 },
          open: true
        }
      ],
      // San Francisco Area (37.7749, -122.4194)
      'sf': [
        {
          name: 'Golden Gate Bridge',
          type: 'attraction',
          category: 'attraction',
          rating: 4.9,
          distance: calculateDistance(lat, lng, 37.8199, -122.4783),
          icon: 'fa-landmark',
          address: 'Golden Gate Bridge, San Francisco, CA',
          phone: '+1 (415) 921-5858',
          hours: '24/7',
          price: 'Free',
          description: 'Suspension bridge spanning the Golden Gate strait, iconic symbol of San Francisco.',
          image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
          coordinates: { lat: 37.8199, lng: -122.4783 },
          open: true
        },
        {
          name: "Fisherman's Wharf",
          type: 'attraction',
          category: 'attraction',
          rating: 4.3,
          distance: calculateDistance(lat, lng, 37.8080, -122.4177),
          icon: 'fa-landmark',
          address: 'Jefferson St, San Francisco, CA 94133',
          phone: '+1 (415) 674-7503',
          hours: '9:00 AM - 9:00 PM',
          price: 'Free',
          description: 'Neighborhood and popular tourist attraction known for its seafood and waterfront views.',
          image: 'https://images.unsplash.com/photo-1546436836-07a91091f160?w=400&h=300&fit=crop',
          coordinates: { lat: 37.8080, lng: -122.4177 },
          open: true
        },
        {
          name: 'Alcatraz Island',
          type: 'attraction',
          category: 'attraction',
          rating: 4.6,
          distance: calculateDistance(lat, lng, 37.8267, -122.4230),
          icon: 'fa-landmark',
          address: 'Alcatraz Island, San Francisco, CA',
          phone: '+1 (415) 561-4900',
          hours: '9:00 AM - 6:30 PM',
          price: '$45-50',
          description: 'Former federal prison on an island in San Francisco Bay.',
          image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
          coordinates: { lat: 37.8267, lng: -122.4230 },
          open: true
        }
      ]
    }

    // Find the closest major city based on coordinates
    const cities = [
      { key: 'ny', lat: 40.7128, lng: -74.0060 },
      { key: 'la', lat: 34.0522, lng: -118.2437 },
      { key: 'chicago', lat: 41.8781, lng: -87.6298 },
      { key: 'sf', lat: 37.7749, lng: -122.4194 }
    ]

    let closestCity = 'ny' // Default to New York
    let minDistance = Infinity

    cities.forEach(city => {
      const distance = Math.sqrt(Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2))
      if (distance < minDistance) {
        minDistance = distance
        closestCity = city.key
      }
    })

    return cityLandmarks[closestCity] || cityLandmarks['ny']
  }

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const filteredPlaces = selectedCategory === 'all' 
    ? places 
    : places.filter(place => place.category === selectedCategory || place.type === selectedCategory)

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.icon || 'fa-map-marker-alt'
  }

  const toggleFavorite = (placeId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(placeId)) {
        newFavorites.delete(placeId)
      } else {
        newFavorites.add(placeId)
      }
      return newFavorites
    })
  }

  const formatRating = (rating: number | string) => {
    if (typeof rating === 'number') {
      return `${rating.toFixed(1)} ★`
    }
    return rating
  }

  const openDirections = (place: Place) => {
    if (place.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.lat},${place.coordinates.lng}`
      window.open(url, '_blank')
    } else {
      alert('Directions not available for this location')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-primary-light"></i>
            Nearby Places
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={getUserLocation}
              disabled={isLoading}
              className="text-primary-light hover:text-primary transition-colors disabled:opacity-50"
              title="Refresh location"
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="text-text-gray hover:text-white transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Location Status */}
        {userLocation && (
          <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <i className="fas fa-location-dot text-primary-light"></i>
              <span className="text-text-gray">
                Showing famous places near your location
              </span>
              <span className="text-xs text-text-gray">
                ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
              </span>
            </div>
          </div>
        )}

        {locationError && (
          <div className="bg-danger/20 border border-danger/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-danger">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{locationError}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-text-gray mb-4">
          Discover famous landmarks near your current location
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-light-gray text-text-gray hover:bg-dark-gray'
              }`}
            >
              <i className={`fas ${category.icon}`}></i>
              {category.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-text-gray">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading nearby places...</p>
          </div>
        ) : filteredPlaces.length > 0 ? (
          <div className="space-y-2">
            {filteredPlaces.map((place, index) => {
              const placeId = place._id || `place-${index}`
              return (
                <div
                  key={placeId}
                  className="bg-dark-gray rounded-lg p-3 hover:bg-light-gray transition-colors cursor-pointer"
                  onClick={() => setSelectedPlace(place)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white flex-shrink-0">
                      <i className={`fas ${place.icon || getCategoryIcon(place.type)}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{place.name}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(placeId)
                            }}
                            className={`text-sm transition-colors ${
                              favorites.has(placeId) ? 'text-danger' : 'text-text-gray hover:text-danger'
                            }`}
                          >
                            <i className={`fas ${favorites.has(placeId) ? 'fa-heart' : 'fa-heart'}`}></i>
                          </button>
                          <span className="text-primary-light font-semibold text-xs">
                            {typeof place.distance === 'number' 
                              ? place.distance < 1000 
                                ? `${place.distance}m` 
                                : `${(place.distance / 1000).toFixed(1)}km`
                              : place.distance}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-gray mb-1">
                        {place.type.charAt(0).toUpperCase() + place.type.slice(1)} • {formatRating(place.rating)}
                        {place.price && ` • ${place.price}`}
                      </p>
                      {place.address && (
                        <p className="text-xs text-text-gray">{place.address}</p>
                      )}
                      {place.open !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${place.open ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-xs ${place.open ? 'text-green-500' : 'text-red-500'}`}>
                            {place.open ? 'Open Now' : 'Closed'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDirections(place)
                      }}
                      className="flex-1 bg-primary text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-directions text-xs"></i>
                      Maps
                    </button>
                    {place.phone && place.phone !== 'N/A' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`tel:${place.phone}`, '_self')
                        }}
                        className="flex-1 bg-light-gray text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-dark-gray transition-colors flex items-center justify-center gap-1"
                      >
                        <i className="fas fa-phone text-xs"></i>
                        Call
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-text-gray">
            <i className="fas fa-map-marker-alt text-4xl mb-4"></i>
            <p>No places found in this category</p>
            <p className="text-sm mt-1">Try selecting a different category</p>
          </div>
        )}

        {!isLoading && places.length === 0 && (
          <div className="text-center py-8 text-text-gray">
            <i className="fas fa-map-marker-alt text-4xl mb-4"></i>
            <p>Enable location sharing to see nearby places</p>
            <button
              onClick={() => navigate('/map')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Go to Map Settings
            </button>
          </div>
        )}
      </div>

      {/* Place Details Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlace(null)}>
          <div className="bg-medium-gray rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedPlace.name}</h3>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-text-gray hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {selectedPlace.image && (
              <img 
                src={selectedPlace.image} 
                alt={selectedPlace.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <i 
                      key={i}
                      className={`fas fa-star text-sm ${
                        i < Math.floor(typeof selectedPlace.rating === 'number' ? selectedPlace.rating : 0)
                          ? 'text-yellow-400'
                          : 'text-text-gray'
                      }`}
                    ></i>
                  ))}
                </div>
                <span className="text-sm text-text-gray">
                  ({formatRating(selectedPlace.rating)})
                </span>
                {selectedPlace.price && (
                  <span className="text-sm text-primary-light">• {selectedPlace.price}</span>
                )}
                <span className="text-sm text-text-gray">
                  • {typeof selectedPlace.distance === 'number' 
                    ? selectedPlace.distance < 1000 
                      ? `${selectedPlace.distance}m` 
                      : `${(selectedPlace.distance / 1000).toFixed(1)}km`
                    : selectedPlace.distance}
                </span>
              </div>

              {selectedPlace.description && (
                <p className="text-sm text-text-gray">{selectedPlace.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {selectedPlace.address && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-primary-light w-5"></i>
                    <span className="text-text-gray">{selectedPlace.address}</span>
                  </div>
                )}
                {selectedPlace.phone && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-phone text-primary-light w-5"></i>
                    <a href={`tel:${selectedPlace.phone}`} className="text-primary-light hover:text-primary">
                      {selectedPlace.phone}
                    </a>
                  </div>
                )}
                {selectedPlace.hours && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-primary-light w-5"></i>
                    <span className={`${selectedPlace.open ? 'text-green-500' : 'text-text-gray'}`}>
                      {selectedPlace.hours}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                  onClick={() => openDirections(selectedPlace)}
                >
                  <i className="fas fa-directions"></i>
                  Directions
                </button>
                <button
                  className="flex-1 bg-light-gray text-white py-2 rounded-lg font-semibold hover:bg-dark-gray transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: selectedPlace.name,
                        text: selectedPlace.description,
                        url: window.location.href
                      }).catch(() => {
                        alert(`Sharing ${selectedPlace.name}`)
                      })
                    } else {
                      alert(`Sharing ${selectedPlace.name}`)
                    }
                  }}
                >
                  <i className="fas fa-share"></i>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

