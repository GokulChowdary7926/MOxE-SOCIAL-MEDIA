import { useState } from 'react'

interface MapControlsProps {
  onTrafficToggle: (enabled: boolean) => void
  onMapTypeChange: (type: 'standard' | 'satellite' | 'terrain') => void
  onNavigationModeChange: (mode: 'driving' | 'cycling' | 'transit' | 'walking') => void
  trafficEnabled: boolean
  mapType: 'standard' | 'satellite' | 'terrain'
  navigationMode: 'driving' | 'cycling' | 'transit' | 'walking'
}

export default function MapControls({
  onTrafficToggle,
  onMapTypeChange,
  onNavigationModeChange,
  trafficEnabled,
  mapType,
  navigationMode,
}: MapControlsProps) {
  const [showControls, setShowControls] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle Button - Mobile */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="w-9 h-9 rounded-lg bg-medium-gray/95 backdrop-blur-sm active:bg-light-gray transition-colors flex items-center justify-center shadow-lg touch-manipulation"
        aria-label="Map controls"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <i className={`fas fa-${showControls ? 'times' : 'layer-group'} text-white text-sm`}></i>
      </button>

      {/* Controls Panel - Mobile */}
      {showControls && (
        <div className="bg-medium-gray/95 backdrop-blur-sm rounded-lg p-2.5 shadow-lg space-y-2.5 min-w-[180px] max-w-[85vw]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Traffic Toggle - Mobile */}
          <label className="flex items-center gap-2 cursor-pointer touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <input
              type="checkbox"
              checked={trafficEnabled}
              onChange={(e) => onTrafficToggle(e.target.checked)}
              className="w-4 h-4 rounded bg-dark-gray border-light-gray text-primary focus:ring-primary"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
            <span className="text-xs text-white flex items-center gap-1.5">
              <i className="fas fa-traffic-light text-primary-light text-xs"></i>
              Traffic
            </span>
          </label>

          {/* Map Type - Mobile */}
          <div>
            <label className="block text-xs text-text-gray mb-1">Map Type</label>
            <div className="flex gap-1">
              <button
                onClick={() => onMapTypeChange('standard')}
                className={`flex-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-colors touch-manipulation ${
                  mapType === 'standard'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Standard
              </button>
              <button
                onClick={() => onMapTypeChange('satellite')}
                className={`flex-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-colors touch-manipulation ${
                  mapType === 'satellite'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Satellite
              </button>
              <button
                onClick={() => onMapTypeChange('terrain')}
                className={`flex-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-colors touch-manipulation ${
                  mapType === 'terrain'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Terrain
              </button>
            </div>
          </div>

          {/* Navigation Mode - Mobile */}
          <div>
            <label className="block text-xs text-text-gray mb-1">Navigation</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => onNavigationModeChange('driving')}
                className={`py-1.5 px-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 touch-manipulation ${
                  navigationMode === 'driving'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <i className="fas fa-car text-xs"></i>
                Drive
              </button>
              <button
                onClick={() => onNavigationModeChange('cycling')}
                className={`py-1.5 px-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 touch-manipulation ${
                  navigationMode === 'cycling'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <i className="fas fa-bicycle text-xs"></i>
                Cycle
              </button>
              <button
                onClick={() => onNavigationModeChange('transit')}
                className={`py-1.5 px-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 touch-manipulation ${
                  navigationMode === 'transit'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <i className="fas fa-bus text-xs"></i>
                Transit
              </button>
              <button
                onClick={() => onNavigationModeChange('walking')}
                className={`py-1.5 px-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 touch-manipulation ${
                  navigationMode === 'walking'
                    ? 'bg-primary text-white'
                    : 'bg-dark-gray text-text-gray active:bg-light-gray'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <i className="fas fa-walking text-xs"></i>
                Walk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

