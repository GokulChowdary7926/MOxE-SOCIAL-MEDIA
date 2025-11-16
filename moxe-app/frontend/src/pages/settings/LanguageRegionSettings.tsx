import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function LanguageRegionSettings() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [settings, setSettings] = useState({
    appLanguage: 'en', // default 'en' will be shown as English (India) in region
    contentLanguage: 'hi',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currency: 'INR',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/users/settings')
      if (response.data.languageRegion) {
        setSettings(response.data.languageRegion)
      }
    } catch (error) {
      console.error('Failed to load language/region settings:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings', { languageRegion: settings })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to save language/region settings:', error)
      setSaveStatus('error')
      alert(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' },
    { value: 'pt', label: 'Portuguese' },
  ]

  const timezones = [
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Australia/Sydney',
  ]

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
          <h1 className="text-xl font-bold text-white">Language & Region</h1>
          <p className="text-sm text-text-gray">Set your language and regional preferences</p>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="bg-success/20 border border-success rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-check-circle text-success"></i>
          <span className="text-success text-sm">Settings saved successfully!</span>
        </div>
      )}

      {/* Language Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Language</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">App Language</label>
          <select
            value={settings.appLanguage}
            onChange={(e) => setSettings({ ...settings, appLanguage: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Content Language</label>
          <select
            value={settings.contentLanguage}
            onChange={(e) => setSettings({ ...settings, contentLanguage: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="auto">Auto (Based on content)</option>
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Region Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Region</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Time Format</label>
          <select
            value={settings.timeFormat}
            onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="INR">INR (₹)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Language & Region Settings'}
      </button>
    </div>
  )
}

