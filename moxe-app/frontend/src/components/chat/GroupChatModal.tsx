import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { chatAPI } from '../../services/api'

interface GroupChatModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: () => void
}

export default function GroupChatModal({ isOpen, onClose, onGroupCreated }: GroupChatModalProps) {
  const { user } = useSelector((state: RootState) => state.auth)
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      }).then(res => res.json())
      setSearchResults(response.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
    }
  }

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert('Please enter a group name and select at least one member')
      return
    }

    setIsLoading(true)
    try {
      await chatAPI.createGroup(groupName, selectedUsers)
      onGroupCreated()
      onClose()
      setGroupName('')
      setSelectedUsers([])
    } catch (error: any) {
      console.error('Failed to create group:', error)
      alert(error.response?.data?.message || 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-medium-gray rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-gray/20">
          <h2 className="text-xl font-bold text-white">Create Group Chat</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Search Users */}
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Add Members</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users..."
                className="flex-1 bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                className="bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-search"></i>
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-dark-gray rounded-lg p-2 max-h-40 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleToggleUser(user._id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      selectedUsers.includes(user._id)
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-light-gray/20'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {user.profile?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{user.profile?.fullName}</p>
                      <p className="text-text-gray text-xs">@{user.profile?.username}</p>
                    </div>
                    {selectedUsers.includes(user._id) && (
                      <i className="fas fa-check-circle text-primary"></i>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <p className="text-sm text-text-gray mb-2">Selected ({selectedUsers.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((userId) => {
                  const user = searchResults.find(u => u._id === userId)
                  if (!user) return null
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm"
                    >
                      <span>{user.profile?.fullName}</span>
                      <button
                        onClick={() => handleToggleUser(userId)}
                        className="hover:text-primary-dark"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-light-gray/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-dark-gray text-white py-2.5 rounded-lg font-semibold hover:bg-light-gray/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isLoading || !groupName.trim() || selectedUsers.length === 0}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

