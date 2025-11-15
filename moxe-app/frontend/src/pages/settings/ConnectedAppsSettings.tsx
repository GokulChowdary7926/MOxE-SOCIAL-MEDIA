import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface ConnectedApp {
  _id: string
  name: string
  icon: string
  connectedAt: string
  permissions: string[]
}

export default function ConnectedAppsSettings() {
  const navigate = useNavigate()
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadConnectedApps()
  }, [])

  const loadConnectedApps = async () => {
    try {
      const response = await api.get('/users/connected-apps')
      setConnectedApps(response.data.apps || [])
    } catch (error) {
      console.error('Failed to load connected apps:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async (appId: string) => {
    if (!confirm('Are you sure you want to disconnect this app?')) return

    try {
      await api.delete(`/users/connected-apps/${appId}`)
      setConnectedApps(connectedApps.filter(app => app._id !== appId))
      alert('App disconnected successfully')
    } catch (error: any) {
      console.error('Failed to disconnect app:', error)
      alert(error.response?.data?.message || 'Failed to disconnect app')
    }
  }

  const availableApps = [
    { name: 'Google', icon: 'fab fa-google', color: 'bg-blue-500' },
    { name: 'Facebook', icon: 'fab fa-facebook', color: 'bg-blue-600' },
    { name: 'Apple', icon: 'fab fa-apple', color: 'bg-gray-800' },
    { name: 'Twitter', icon: 'fab fa-twitter', color: 'bg-blue-400' },
    { name: 'Spotify', icon: 'fab fa-spotify', color: 'bg-green-500' },
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
          <h1 className="text-xl font-bold text-white">Connected Apps</h1>
          <p className="text-sm text-text-gray">Manage third-party app connections</p>
        </div>
      </div>

      {/* Connected Apps */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
        </div>
      ) : connectedApps.length === 0 ? (
        <div className="bg-medium-gray rounded-2xl p-8 text-center">
          <i className="fas fa-plug text-text-gray text-4xl mb-4"></i>
          <p className="text-text-gray">No connected apps</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connectedApps.map((app) => (
            <div key={app._id} className="bg-medium-gray rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <i className={`${app.icon} text-primary text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{app.name}</p>
                    <p className="text-text-gray text-xs">
                      Connected {new Date(app.connectedAt).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {app.permissions.map((perm, idx) => (
                        <span key={idx} className="text-xs text-text-gray bg-dark-gray px-2 py-0.5 rounded">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(app._id)}
                  className="text-danger text-sm font-medium hover:underline ml-3"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Apps */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Available Apps</h2>
        <div className="space-y-2">
          {availableApps.map((app) => (
            <button
              key={app.name}
              onClick={() => {
                // In real implementation, would initiate OAuth flow
                alert(`${app.name} connection coming soon!`)
              }}
              className="w-full flex items-center justify-between p-3 bg-dark-gray rounded-lg hover:bg-light-gray/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${app.color} flex items-center justify-center`}>
                  <i className={`${app.icon} text-white text-lg`}></i>
                </div>
                <span className="text-white font-medium">{app.name}</span>
              </div>
              <i className="fas fa-chevron-right text-text-gray"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

