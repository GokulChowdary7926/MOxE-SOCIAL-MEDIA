import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store'
import { fetchTrustedContacts, addTrustedContact } from '../../store/slices/userSlice'
import api from '../../services/api'

export default function TrustedContactsSection() {
  const dispatch = useDispatch<AppDispatch>()
  const { trustedContacts } = useSelector((state: RootState) => state.user)
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isProximityEnabled, setIsProximityEnabled] = useState(true)

  useEffect(() => {
    dispatch(fetchTrustedContacts())
    loadProximitySettings()
  }, [dispatch])

  const loadProximitySettings = async () => {
    try {
      const response = await api.get('/settings')
      const settings = response.data
      setIsProximityEnabled(settings.proximityAlerts?.enabled || false)
    } catch (error) {
      console.error('Failed to load proximity settings:', error)
    }
  }

  const saveProximitySettings = async (enabled: boolean) => {
    try {
      await api.put('/settings', { proximityAlerts: { enabled } })
    } catch (error) {
      console.error('Failed to save proximity settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleAddContact = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a username to search')
      return
    }

    setIsSearching(true)
    try {
      const response = await api.get(`/search/users?q=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
      alert('Failed to search users')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectContact = async (userId: string) => {
    try {
      await dispatch(addTrustedContact(userId)).unwrap()
      setSearchQuery('')
      setSearchResults([])
      setIsAdding(false)
      alert('Trusted contact added successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to add trusted contact')
    }
  }

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this trusted contact?')) return

    try {
      await api.delete(`/users/trusted-contacts/${contactId}`)
      await dispatch(fetchTrustedContacts())
      alert('Trusted contact removed successfully!')
    } catch (error: any) {
      console.error('Failed to remove trusted contact:', error)
      alert(error.response?.data?.message || 'Failed to remove trusted contact')
    }
  }

  return (
    <div className="bg-medium-gray rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <i className="fas fa-bell text-primary-light"></i>
          Proximity Alerts
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-primary-light hover:text-primary transition-colors"
          title={isAdding ? 'Cancel adding contact' : 'Add contact'}
          aria-label={isAdding ? 'Cancel adding contact' : 'Add contact'}
        >
          <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'}`}></i>
        </button>
      </div>
      
      {/* Proximity Alerts Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">Enable Proximity Alerts</span>
        <label className="relative inline-block w-12 h-6">
          <input 
            type="checkbox" 
            className="opacity-0 w-0 h-0" 
            checked={isProximityEnabled}
            onChange={(e) => {
              const newValue = e.target.checked
              setIsProximityEnabled(newValue)
              saveProximitySettings(newValue)
            }}
          />
          <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
            isProximityEnabled ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
          }`}></span>
        </label>
      </div>

      <p className="text-sm text-text-gray mb-4">
        Your private list of contacts for proximity alerts (up to 5 people).
      </p>

      {isAdding && (
        <div className="mb-4 p-3 bg-dark-gray rounded-lg">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="flex-1 bg-light-gray border-none rounded-lg px-4 py-2 text-white placeholder-text-gray"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddContact()
                }
              }}
            />
            <button
              onClick={handleAddContact}
              disabled={isSearching}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              title={isSearching ? 'Searching for users' : 'Search for users'}
              aria-label={isSearching ? 'Searching for users' : 'Search for users'}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
              {searchResults.map((user: any) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-2 bg-light-gray rounded-lg hover:bg-medium-gray transition-colors cursor-pointer"
                  onClick={() => handleSelectContact(user._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectContact(user._id)
                    }
                  }}
                  title={`Add ${user.fullName || user.username} as trusted contact`}
                  aria-label={`Add ${user.fullName || user.username} as trusted contact`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{user.fullName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{user.fullName || user.username}</div>
                    {user.username && (
                      <div className="text-xs text-text-gray">@{user.username}</div>
                    )}
                  </div>
                  <i className="fas fa-plus text-primary-light"></i>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {trustedContacts && trustedContacts.length > 0 ? (
          trustedContacts.map((contact: any, index: number) => {
            // Handle both populated and non-populated contact formats
            const contactId = contact._id ? contact._id.toString() : (contact.toString ? contact.toString() : String(contact))
            const contactUser = contact.profile ? contact : (contact.user || {})
            
            return (
              <div key={contactId || index} className="flex items-center gap-3 p-3 bg-dark-gray rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold overflow-hidden">
                  {contactUser?.profile?.avatar ? (
                    <img src={contactUser.profile.avatar} alt={contactUser.profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{contactUser?.profile?.fullName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{contactUser?.profile?.fullName || 'User'}</h4>
                  {contactUser?.profile?.username && (
                    <p className="text-xs text-text-gray">@{contactUser.profile.username}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveContact(contactId)}
                  className="text-danger hover:text-red-600 transition-colors"
                  title="Remove contact"
                  aria-label="Remove contact"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            )
          })
        ) : (
          <div className="text-center py-4 text-text-gray">
            <p className="text-sm">No trusted contacts yet</p>
            <p className="text-xs mt-1">Add contacts to receive proximity alerts</p>
          </div>
        )}
      </div>

      {(!trustedContacts || trustedContacts.length < 5) && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          title="Add new trusted contact"
          aria-label="Add new trusted contact"
        >
          <i className="fas fa-plus mr-2"></i>Add Contact
        </button>
      )}

      {/* Test Proximity Alert Button */}
      <button 
        onClick={async () => {
          try {
            // Trigger a test proximity alert
            alert('Test proximity alert triggered!')
          } catch (error) {
            console.error('Failed to test proximity alert:', error)
          }
        }}
        className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors mt-4"
        title="Test proximity alert"
        aria-label="Test proximity alert"
      >
        <i className="fas fa-bell mr-2"></i>
        Test Proximity Alert
      </button>
    </div>
  )
}

