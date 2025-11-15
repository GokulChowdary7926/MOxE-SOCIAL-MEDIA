import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Place {
  _id?: string
  name: string
  address: string
  coordinates: { lat: number; lng: number }
  type: 'place' | 'route' | 'guide'
  notes?: string
  category?: string
  rating?: number
  priceLevel?: number
}

interface PlacesLibraryProps {
  onPlaceSelect: (place: Place) => void
  onClose: () => void
}

export default function PlacesLibrary({ onPlaceSelect, onClose }: PlacesLibraryProps) {
  const [places, setPlaces] = useState<Place[]>([])
  const [activeTab, setActiveTab] = useState<'places' | 'routes' | 'guides'>('places')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlace, setNewPlace] = useState({
    name: '',
    address: '',
    notes: '',
    category: '',
  })

  useEffect(() => {
    loadPlaces()
  }, [])

  const loadPlaces = async () => {
    try {
      const response = await api.get('/location/saved-places')
      setPlaces(response.data.places || [])
    } catch (error) {
      console.error('Failed to load places:', error)
    }
  }

  const handleSavePlace = async () => {
    if (!newPlace.name.trim()) {
      alert('Please enter a place name')
      return
    }

    try {
      // Get current location or use geocoding
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      const place: Place = {
        name: newPlace.name,
        address: newPlace.address || 'Current location',
        coordinates: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        type: activeTab === 'places' ? 'place' : activeTab === 'routes' ? 'route' : 'guide',
        notes: newPlace.notes,
        category: newPlace.category,
      }

      await api.post('/location/saved-places', place)
      await loadPlaces()
      setShowAddForm(false)
      setNewPlace({ name: '', address: '', notes: '', category: '' })
      alert('Place saved successfully!')
    } catch (error: any) {
      console.error('Failed to save place:', error)
      alert(error.response?.data?.message || 'Failed to save place')
    }
  }

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm('Are you sure you want to delete this place?')) return

    try {
      await api.delete(`/location/saved-places/${placeId}`)
      await loadPlaces()
      alert('Place deleted successfully!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete place')
    }
  }

  const filteredPlaces = places.filter((p) => {
    if (activeTab === 'places') return p.type === 'place'
    if (activeTab === 'routes') return p.type === 'route'
    return p.type === 'guide'
  })

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-medium-gray rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        style={{
          maxWidth: '100vw',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Mobile Optimized */}
        <div className="p-4 border-b border-dark-gray flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Places Library</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-dark-gray active:bg-light-gray transition-colors flex items-center justify-center touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            aria-label="Close"
          >
            <i className="fas fa-times text-white text-xs"></i>
          </button>
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="flex border-b border-dark-gray">
          {(['places', 'routes', 'guides'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors touch-manipulation ${
                activeTab === tab
                  ? 'text-primary-light border-b-2 border-primary-light'
                  : 'text-text-gray active:text-white'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content - Mobile Optimized */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {showAddForm ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Place name *"
                value={newPlace.name}
                onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                className="w-full bg-dark-gray text-white rounded-xl px-4 py-3 text-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                autoComplete="off"
              />
              <input
                type="text"
                placeholder="Address (optional)"
                value={newPlace.address}
                onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                className="w-full bg-dark-gray text-white rounded-xl px-4 py-3 text-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                autoComplete="off"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={newPlace.category}
                onChange={(e) => setNewPlace({ ...newPlace, category: e.target.value })}
                className="w-full bg-dark-gray text-white rounded-xl px-4 py-3 text-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                autoComplete="off"
              />
              <textarea
                placeholder="Notes (optional)"
                value={newPlace.notes}
                onChange={(e) => setNewPlace({ ...newPlace, notes: e.target.value })}
                className="w-full bg-dark-gray text-white rounded-xl px-4 py-3 text-sm min-h-[100px] resize-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSavePlace}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold active:bg-primary-dark transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewPlace({ name: '', address: '', notes: '', category: '' })
                  }}
                  className="flex-1 bg-dark-gray text-white py-3 rounded-xl font-semibold active:bg-light-gray transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => (
                  <div
                    key={place._id}
                    className="bg-dark-gray rounded-xl p-3 active:bg-light-gray transition-colors touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm leading-tight">{place.name}</h3>
                        <p className="text-xs text-text-gray mt-1 line-clamp-2">{place.address}</p>
                        {place.notes && (
                          <p className="text-xs text-text-gray mt-2 line-clamp-2">{place.notes}</p>
                        )}
                        {place.category && (
                          <span className="inline-block mt-2 text-xs bg-primary/20 text-primary-light px-2 py-1 rounded-full">
                            {place.category}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => onPlaceSelect(place)}
                          className="w-9 h-9 rounded-lg bg-primary/20 active:bg-primary/30 text-primary-light flex items-center justify-center transition-colors touch-manipulation"
                          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                          title="Go to place"
                          aria-label="Go to place"
                        >
                          <i className="fas fa-map-marker-alt text-xs"></i>
                        </button>
                        <button
                          onClick={() => place._id && handleDeletePlace(place._id)}
                          className="w-9 h-9 rounded-lg bg-dark-gray active:bg-light-gray text-text-gray active:text-danger flex items-center justify-center transition-colors touch-manipulation"
                          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                          title="Delete"
                          aria-label="Delete place"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-gray">
                  <i className="fas fa-bookmark text-4xl mb-3 opacity-50"></i>
                  <p className="text-sm">No {activeTab} saved yet</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Mobile Optimized */}
        {!showAddForm && (
          <div className="p-4 border-t border-dark-gray" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold active:bg-primary-dark transition-colors flex items-center justify-center gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <i className="fas fa-plus text-sm"></i>
              <span className="text-sm">Add {activeTab === 'places' ? 'Place' : activeTab === 'routes' ? 'Route' : 'Guide'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


