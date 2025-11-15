import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface BlockedUser {
  _id: string
  user: {
    _id: string
    profile: {
      fullName: string
      username: string
      avatar?: string
    }
  }
  blockedAt: string
  reason?: string
}

export default function BlockedUsers() {
  const navigate = useNavigate()
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadBlockedUsers()
  }, [])

  const loadBlockedUsers = async () => {
    try {
      const response = await api.get('/users/blocked')
      setBlockedUsers(response.data.blockedUsers || [])
    } catch (error) {
      console.error('Failed to load blocked users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) return

    try {
      await api.post(`/users/unblock/${userId}`)
      setBlockedUsers(blockedUsers.filter(bu => bu.user._id !== userId))
      alert('User unblocked successfully')
    } catch (error: any) {
      console.error('Failed to unblock user:', error)
      alert(error.response?.data?.message || 'Failed to unblock user')
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
          <h1 className="text-xl font-bold text-white">Blocked Users</h1>
          <p className="text-sm text-text-gray">Manage users you've blocked</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="bg-medium-gray rounded-2xl p-8 text-center">
          <i className="fas fa-user-slash text-text-gray text-4xl mb-4"></i>
          <p className="text-text-gray">No blocked users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map((blockedUser) => (
            <div key={blockedUser._id} className="bg-medium-gray rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold overflow-hidden">
                    {blockedUser.user.profile.avatar ? (
                      <img
                        src={blockedUser.user.profile.avatar}
                        alt={blockedUser.user.profile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      blockedUser.user.profile.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {blockedUser.user.profile.fullName}
                    </p>
                    <p className="text-text-gray text-xs truncate">
                      @{blockedUser.user.profile.username}
                    </p>
                    {blockedUser.reason && (
                      <p className="text-text-gray text-xs mt-1">Reason: {blockedUser.reason}</p>
                    )}
                    <p className="text-text-gray text-xs mt-1">
                      Blocked {new Date(blockedUser.blockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(blockedUser.user._id)}
                  className="bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors ml-3"
                >
                  Unblock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

