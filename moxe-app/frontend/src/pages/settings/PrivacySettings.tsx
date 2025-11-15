import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
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

export default function PrivacySettings() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    whoCanSeePosts: 'all',
    whoCanDM: 'everyone',
    readReceipts: true,
    hideOnlineStatus: false,
    allowScreenshots: true,
    allowDownloads: true,
    profileVisitTracking: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/users/settings')
      if (response.data.privacy) {
        setSettings({
          profileVisibility: response.data.privacy.profileVisibility || 'public',
          whoCanSeePosts: response.data.privacy.whoCanSeePosts || 'all',
          whoCanDM: response.data.privacy.whoCanDM || 'everyone',
          readReceipts: response.data.privacy.readReceipts !== false,
          hideOnlineStatus: response.data.privacy.hideOnlineStatus || false,
          allowScreenshots: response.data.privacy.allowScreenshots !== false,
          allowDownloads: response.data.privacy.allowDownloads !== false,
          profileVisitTracking: response.data.privacy.profileVisitTracking !== false,
        })
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings', { privacy: settings })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to save privacy settings:', error)
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
          <h1 className="text-xl font-bold text-white">Privacy Settings</h1>
          <p className="text-sm text-text-gray">Control who can see your content</p>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="bg-success/20 border border-success rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-check-circle text-success"></i>
          <span className="text-success text-sm">Settings saved successfully!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-danger/20 border border-danger rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-exclamation-circle text-danger"></i>
          <span className="text-danger text-sm">Failed to save settings. Please try again.</span>
        </div>
      )}

      {/* Profile Visibility */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Profile Visibility</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Who can see your profile</label>
          <select
            value={settings.profileVisibility}
            onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="public">🌐 Everyone</option>
            <option value="followers">👥 Followers Only</option>
            <option value="close_friends">⭐ Close Friends Only</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>
      </div>

      {/* Post Visibility */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Post Visibility</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Who can see your posts</label>
          <select
            value={settings.whoCanSeePosts}
            onChange={(e) => setSettings({ ...settings, whoCanSeePosts: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="all">🌐 Everyone</option>
            <option value="following">👥 Following</option>
            <option value="close_friends">⭐ Close Friends</option>
            <option value="premium">👑 Premium</option>
            <option value="thick">💎 Thick</option>
          </select>
        </div>
      </div>

      {/* DM Settings */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Direct Messages</h2>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-2">Who can send you messages</label>
          <select
            value={settings.whoCanDM}
            onChange={(e) => setSettings({ ...settings, whoCanDM: e.target.value })}
            className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
          >
            <option value="everyone">🌐 Everyone</option>
            <option value="followers">👥 Followers Only</option>
            <option value="close_friends">⭐ Close Friends Only</option>
            <option value="none">🔒 No One</option>
          </select>
        </div>
        <ToggleSwitch
          checked={settings.readReceipts}
          onChange={(val) => setSettings({ ...settings, readReceipts: val })}
          label="Read Receipts"
          description="Let others know when you've read their messages"
        />
      </div>

      {/* Activity Status */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Activity Status</h2>
        <ToggleSwitch
          checked={settings.hideOnlineStatus}
          onChange={(val) => setSettings({ ...settings, hideOnlineStatus: val })}
          label="Hide Online Status"
          description="Don't show when you're online"
        />
        <ToggleSwitch
          checked={settings.profileVisitTracking}
          onChange={(val) => setSettings({ ...settings, profileVisitTracking: val })}
          label="Profile Visit Tracking"
          description="Track who visits your profile"
        />
      </div>

      {/* Content Protection */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Content Protection</h2>
        <ToggleSwitch
          checked={settings.allowScreenshots}
          onChange={(val) => setSettings({ ...settings, allowScreenshots: val })}
          label="Allow Screenshots"
          description="Let others take screenshots of your content"
        />
        <ToggleSwitch
          checked={settings.allowDownloads}
          onChange={(val) => setSettings({ ...settings, allowDownloads: val })}
          label="Allow Downloads"
          description="Let others download your media"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Privacy Settings'}
      </button>
    </div>
  )
}

