import { useState, useEffect, useRef } from 'react'
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

export default function NotificationSettings() {
  const navigate = useNavigate()
  const quietRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [settings, setSettings] = useState({
    push: {
      enabled: true,
      likes: true,
      comments: true,
      follows: true,
      mentions: true,
      messages: true,
      stories: true,
      live: true,
    },
    email: {
      enabled: true,
      weeklyDigest: true,
      securityAlerts: true,
      productUpdates: false,
    },
    inApp: {
      enabled: true,
      sound: true,
      vibration: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    grouping: {
      byType: true,
    },
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/users/settings')
      if (response.data.notifications) {
        const notif = response.data.notifications
        setSettings({
          push: {
            enabled: notif.push?.enabled !== false,
            likes: notif.push?.likes !== false,
            comments: notif.push?.comments !== false,
            follows: notif.push?.follows !== false,
            mentions: notif.push?.mentions !== false,
            messages: notif.push?.messages !== false,
            stories: notif.push?.stories !== false,
            live: notif.push?.live !== false,
          },
          email: {
            enabled: notif.email?.enabled !== false,
            weeklyDigest: notif.email?.weeklyDigest !== false,
            securityAlerts: notif.email?.securityAlerts !== false,
            productUpdates: notif.email?.productUpdates || false,
          },
          inApp: {
            enabled: notif.inApp?.enabled !== false,
            sound: notif.inApp?.sound !== false,
            vibration: notif.inApp?.vibration !== false,
          },
          quietHours: {
            enabled: notif.quietHours?.enabled || false,
            start: notif.quietHours?.start || '22:00',
            end: notif.quietHours?.end || '07:00',
          },
          grouping: {
            byType: notif.grouping?.byType !== false,
          },
        })
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings', { notifications: settings })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to save notification settings:', error)
      setSaveStatus('error')
      alert(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-full bg-medium-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Notification Settings</h1>
          <p className="text-sm text-text-gray">Control how you receive notifications</p>
        </div>
      </div>
      {settings.quietHours.enabled && (
        <div className="bg-medium-gray rounded-xl p-3 text-xs text-text-gray flex items-center justify-between">
          <div>
            Quiet hours active daily from <span className="text-white">{settings.quietHours.start}</span> to <span className="text-white">{settings.quietHours.end}</span>.
          </div>
          <button
            onClick={() => quietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="text-white bg-dark-gray px-3 py-1 rounded-lg hover:bg-light-gray transition-colors"
          >
            Manage
          </button>
        </div>
      )}

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="bg-success/20 border border-success rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-check-circle text-success"></i>
          <span className="text-success text-sm">Settings saved successfully!</span>
        </div>
      )}

      {/* Push Notifications */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Push Notifications</h2>
        <ToggleSwitch
          checked={settings.push.enabled}
          onChange={(val) => setSettings({ ...settings, push: { ...settings.push, enabled: val } })}
          label="Enable Push Notifications"
        />
        {settings.push.enabled && (
          <div className="space-y-1 pl-4 border-l-2 border-primary/30">
            <ToggleSwitch
              checked={settings.push.likes}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, likes: val } })}
              label="Likes"
            />
            <ToggleSwitch
              checked={settings.push.comments}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, comments: val } })}
              label="Comments"
            />
            <ToggleSwitch
              checked={settings.push.follows}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, follows: val } })}
              label="New Followers"
            />
            <ToggleSwitch
              checked={settings.push.mentions}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, mentions: val } })}
              label="Mentions"
            />
            <ToggleSwitch
              checked={settings.push.messages}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, messages: val } })}
              label="Direct Messages"
            />
            <ToggleSwitch
              checked={settings.push.stories}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, stories: val } })}
              label="Story Updates"
            />
            <ToggleSwitch
              checked={settings.push.live}
              onChange={(val) => setSettings({ ...settings, push: { ...settings.push, live: val } })}
              label="Live Streams"
            />
          </div>
        )}
      </div>

      {/* Email Notifications */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
        <ToggleSwitch
          checked={settings.email.enabled}
          onChange={(val) => setSettings({ ...settings, email: { ...settings.email, enabled: val } })}
          label="Enable Email Notifications"
        />
        {settings.email.enabled && (
          <div className="space-y-1 pl-4 border-l-2 border-primary/30">
            <ToggleSwitch
              checked={settings.email.weeklyDigest}
              onChange={(val) => setSettings({ ...settings, email: { ...settings.email, weeklyDigest: val } })}
              label="Weekly Digest"
              description="Summary of your week on MOXE"
            />
            <ToggleSwitch
              checked={settings.email.securityAlerts}
              onChange={(val) => setSettings({ ...settings, email: { ...settings.email, securityAlerts: val } })}
              label="Security Alerts"
              description="Important security notifications"
            />
            <ToggleSwitch
              checked={settings.email.productUpdates}
              onChange={(val) => setSettings({ ...settings, email: { ...settings.email, productUpdates: val } })}
              label="Product Updates"
              description="New features and updates"
            />
          </div>
        )}
      </div>

      {/* In-App Notifications */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">In-App Notifications</h2>
        <ToggleSwitch
          checked={settings.inApp.enabled}
          onChange={(val) => setSettings({ ...settings, inApp: { ...settings.inApp, enabled: val } })}
          label="Enable In-App Notifications"
        />
        {settings.inApp.enabled && (
          <div className="space-y-1 pl-4 border-l-2 border-primary/30">
            <ToggleSwitch
              checked={settings.inApp.sound}
              onChange={(val) => setSettings({ ...settings, inApp: { ...settings.inApp, sound: val } })}
              label="Sound"
            />
            <ToggleSwitch
              checked={settings.inApp.vibration}
              onChange={(val) => setSettings({ ...settings, inApp: { ...settings.inApp, vibration: val } })}
              label="Vibration"
            />
          </div>
        )}
      </div>

      {/* Quiet Hours */}
      <div ref={quietRef} className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Quiet Hours</h2>
        <ToggleSwitch
          checked={settings.quietHours.enabled}
          onChange={(val) => setSettings({ ...settings, quietHours: { ...settings.quietHours, enabled: val } })}
          label="Enable Quiet Hours"
          description="Mute push notifications during set hours"
        />
        {settings.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div>
              <label className="block text-xs text-text-gray mb-1">Start</label>
              <input
                type="time"
                value={settings.quietHours.start}
                onChange={(e) => setSettings({ ...settings, quietHours: { ...settings.quietHours, start: e.target.value } })}
                className="w-full bg-dark-gray border-none rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-gray mb-1">End</label>
              <input
                type="time"
                value={settings.quietHours.end}
                onChange={(e) => setSettings({ ...settings, quietHours: { ...settings.quietHours, end: e.target.value } })}
                className="w-full bg-dark-gray border-none rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouping */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-2">
        <h2 className="text-lg font-semibold text-white">Notification Grouping</h2>
        <ToggleSwitch
          checked={settings.grouping.byType}
          onChange={(val) => setSettings({ ...settings, grouping: { byType: val } })}
          label="Group notifications by type"
          description="Combine similar notifications into a single summary"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Notification Settings'}
      </button>
    </div>
  )
}


