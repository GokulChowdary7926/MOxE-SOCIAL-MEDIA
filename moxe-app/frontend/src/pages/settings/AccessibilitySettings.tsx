import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{label}</p>
        {description && <p className="text-text-gray text-xs mt-1">{description}</p>}
      </div>
      <label className="relative inline-block w-12 h-6 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="opacity-0 w-0 h-0"
        />
        <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
          checked ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
        }`}></span>
      </label>
    </div>
  )
}

export default function AccessibilitySettings() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [settings, setSettings] = useState({
    screenReader: false,
    fontSize: 'medium',
    colorContrast: 'normal',
    reducedMotion: false,
    highContrast: false,
    captions: true,
    audioDescriptions: false,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/users/settings')
      if (response.data.accessibility) {
        setSettings(response.data.accessibility)
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings', { accessibility: settings })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to save accessibility settings:', error)
      setSaveStatus('error')
      alert(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-full bg-medium-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Accessibility Settings</h1>
          <p className="text-sm text-text-gray">Customize your experience</p>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="bg-success/20 border border-success rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-check-circle text-success"></i>
          <span className="text-success text-sm">Settings saved successfully!</span>
        </div>
      )}

      {/* Display Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Display</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Font Size</label>
          <select
            value={settings.fontSize}
            onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Color Contrast</label>
          <select
            value={settings.colorContrast}
            onChange={(e) => setSettings({ ...settings, colorContrast: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="maximum">Maximum</option>
          </select>
        </div>
        <ToggleSwitch
          checked={settings.highContrast}
          onChange={(val) => setSettings({ ...settings, highContrast: val })}
          label="High Contrast Mode"
          description="Increase contrast for better visibility"
        />
      </div>

      {/* Motion Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Motion</h2>
        <ToggleSwitch
          checked={settings.reducedMotion}
          onChange={(val) => setSettings({ ...settings, reducedMotion: val })}
          label="Reduce Motion"
          description="Minimize animations and transitions"
        />
      </div>

      {/* Audio/Video Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Audio & Video</h2>
        <ToggleSwitch
          checked={settings.captions}
          onChange={(val) => setSettings({ ...settings, captions: val })}
          label="Show Captions"
          description="Display captions for videos"
        />
        <ToggleSwitch
          checked={settings.audioDescriptions}
          onChange={(val) => setSettings({ ...settings, audioDescriptions: val })}
          label="Audio Descriptions"
          description="Narrate visual content"
        />
      </div>

      {/* Screen Reader */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Screen Reader</h2>
        <ToggleSwitch
          checked={settings.screenReader}
          onChange={(val) => setSettings({ ...settings, screenReader: val })}
          label="Enable Screen Reader Support"
          description="Optimize for screen reading software"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Accessibility Settings'}
      </button>
    </div>
  )
}

