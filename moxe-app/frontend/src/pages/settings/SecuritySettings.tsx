import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface Session {
  _id: string
  device: string
  location: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

export default function SecuritySettings() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loginActivity, setLoginActivity] = useState<any[]>([])

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      const [settingsRes, sessionsRes, activityRes] = await Promise.all([
        api.get('/users/settings'),
        api.get('/users/sessions'),
        api.get('/users/login-activity'),
      ])
      
      setTwoFactorEnabled(settingsRes.data.security?.twoFactorEnabled || false)
      setSessions(sessionsRes.data.sessions || [])
      setLoginActivity(activityRes.data.activity || [])
    } catch (error) {
      console.error('Failed to load security data:', error)
    }
  }

  const handleToggle2FA = async () => {
    setIsLoading(true)
    try {
      if (!twoFactorEnabled) {
        // Enable 2FA - would typically show QR code setup
        const response = await api.post('/users/security/2fa/enable')
        alert('2FA setup initiated. Please scan the QR code.')
        // In real implementation, show QR code modal
      } else {
        await api.post('/users/security/2fa/disable')
        setTwoFactorEnabled(false)
        alert('2FA disabled successfully')
      }
    } catch (error: any) {
      console.error('Failed to toggle 2FA:', error)
      alert(error.response?.data?.message || 'Failed to update 2FA settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return

    try {
      await api.delete(`/users/sessions/${sessionId}`)
      setSessions(sessions.filter(s => s._id !== sessionId))
      alert('Session revoked successfully')
    } catch (error: any) {
      console.error('Failed to revoke session:', error)
      alert('Failed to revoke session')
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will need to log in again on other devices.')) return

    try {
      await api.delete('/users/sessions/all')
      setSessions(sessions.filter(s => s.isCurrent))
      alert('All other sessions revoked successfully')
    } catch (error: any) {
      console.error('Failed to revoke sessions:', error)
      alert('Failed to revoke sessions')
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
          <h1 className="text-xl font-bold text-white">Security Settings</h1>
          <p className="text-sm text-text-gray">Manage your account security</p>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Enable 2FA</p>
            <p className="text-text-gray text-xs mt-1">Add an extra layer of security to your account</p>
          </div>
          <label className="relative inline-block w-12 h-6 flex-shrink-0">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={handleToggle2FA}
              disabled={isLoading}
              className="opacity-0 w-0 h-0"
            />
            <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
              twoFactorEnabled ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
            }`}></span>
          </label>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Active Sessions</h2>
          {sessions.filter(s => !s.isCurrent).length > 0 && (
            <button
              onClick={handleRevokeAllSessions}
              className="text-danger text-sm font-medium hover:underline"
            >
              Revoke All
            </button>
          )}
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session._id} className="bg-dark-gray rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{session.device}</p>
                    {session.isCurrent && (
                      <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-text-gray text-xs mt-1">{session.location}</p>
                  <p className="text-text-gray text-xs">{session.ipAddress}</p>
                  <p className="text-text-gray text-xs">Last active: {new Date(session.lastActive).toLocaleString()}</p>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session._id)}
                    className="text-danger text-sm font-medium hover:underline ml-2"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-text-gray text-sm text-center py-4">No active sessions</p>
          )}
        </div>
      </div>

      {/* Login Activity */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Recent Login Activity</h2>
        <div className="space-y-2">
          {loginActivity.slice(0, 10).map((activity, index) => (
            <div key={index} className="bg-dark-gray rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{activity.action}</p>
                  <p className="text-text-gray text-xs mt-1">{activity.device} • {activity.location}</p>
                  <p className="text-text-gray text-xs">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
                {activity.success ? (
                  <i className="fas fa-check-circle text-success"></i>
                ) : (
                  <i className="fas fa-times-circle text-danger"></i>
                )}
              </div>
            </div>
          ))}
          {loginActivity.length === 0 && (
            <p className="text-text-gray text-sm text-center py-4">No login activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

