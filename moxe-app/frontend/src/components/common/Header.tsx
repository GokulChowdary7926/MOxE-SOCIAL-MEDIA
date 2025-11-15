import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { debounce } from '../../utils/helpers'
import api from '../../services/api'

export default function Header() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setIsSearching(true)
    try {
      const response = await api.get(`/discover/search?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, 300)

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery)
    } else {
      setSearchResults(null)
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-secondary p-4 shadow-lg">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <i className="fas fa-shield-alt text-white bg-white/20 p-2 rounded-full"></i>
          <h1 className="text-white text-xl font-bold cursor-pointer" onClick={() => navigate('/')}>MOXE</h1>
        </div>
        
        {showSearch ? (
          <div ref={searchRef} className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-white/20 text-white placeholder-white/70 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                  setSearchResults(null)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-medium-gray rounded-lg shadow-xl max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-text-gray">
                    <i className="fas fa-spinner fa-spin"></i> Searching...
                  </div>
                ) : (
                  <>
                    {searchResults.posts?.length > 0 && (
                      <div className="p-2">
                        <h3 className="text-text-gray text-xs font-semibold px-2 py-1">Posts</h3>
                        {searchResults.posts.slice(0, 5).map((post: any) => (
                          <div
                            key={post._id}
                            onClick={() => {
                              navigate('/')
                              setShowSearch(false)
                            }}
                            className="p-2 hover:bg-light-gray/20 rounded cursor-pointer"
                          >
                            <p className="text-white text-sm line-clamp-2">{post.content?.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.users?.length > 0 && (
                      <div className="p-2 border-t border-light-gray/20">
                        <h3 className="text-text-gray text-xs font-semibold px-2 py-1">People</h3>
                        {searchResults.users.slice(0, 5).map((user: any) => (
                          <div
                            key={user._id}
                            onClick={() => {
                              navigate(`/profile/${user._id}`)
                              setShowSearch(false)
                            }}
                            className="p-2 hover:bg-light-gray/20 rounded cursor-pointer flex items-center gap-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                              {user.profile?.fullName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-white text-sm">{user.profile?.fullName || user.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isSearching && (!searchResults.posts?.length && !searchResults.users?.length) && (
                      <div className="p-4 text-center text-text-gray text-sm">No results found</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => setShowSearch(true)}
              title="Search"
            >
              <i className="fas fa-search"></i>
            </button>
            <button 
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => navigate('/create-post')}
              title="Create Post"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              className="text-white text-lg hover:text-accent transition-colors relative"
              onClick={() => navigate('/notifications')}
              title="Notifications"
            >
              <i className="fas fa-bell"></i>
            </button>
            <button
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <i className="fas fa-cog"></i>
            </button>
            <button 
              className="text-white text-lg hover:text-accent transition-colors" 
              onClick={() => navigate('/profile')}
              title="Profile"
            >
              <i className="fas fa-user-circle"></i>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
