import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Explore() {
  const navigate = useNavigate()
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadExploreData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement
        // Don't close if clicking inside search results
        if (!target.closest('.search-results-container')) {
          setShowResults(false)
        }
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showResults])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 500) // Debounce search by 500ms
    } else {
      setSearchResults(null)
      setShowResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null)
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(true)
    
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults({ users: [], posts: [], hashtags: [] })
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`)
    setSearchQuery('')
    setShowResults(false)
  }

  const handleHashtagClick = (hashtag: string) => {
    // Navigate to hashtag page or filter posts
    navigate(`/explore?hashtag=${encodeURIComponent(hashtag)}`)
    setSearchQuery('')
    setShowResults(false)
  }

  const handlePostClick = (postId: string) => {
    // Navigate to post detail or show in modal
    navigate(`/post/${postId}`)
    setSearchQuery('')
    setShowResults(false)
  }

  const loadExploreData = async () => {
    try {
      const topicsResponse = await api.get('/explore/trending').catch(() => ({ data: { trendingTopics: [] } }))
      setTrendingTopics(topicsResponse.data.trendingTopics || [])
    } catch (error) {
      console.error('Failed to load explore data:', error)
      // Use fallback data
      setTrendingTopics([
        { tag: '#WeekendVibes', count: 1250 },
        { tag: '#CoffeeLovers', count: 980 },
        { tag: '#WorkFromCafe', count: 750 },
        { tag: '#LocalBusiness', count: 620 },
      ])
    }
  }

  const discoverCategories = [
    { icon: 'fa-music', gradient: 'linear-gradient(135deg, #6a11cb, #2575fc)', category: 'music' },
    { icon: 'fa-utensils', gradient: 'linear-gradient(135deg, #ff4d8d, #ff8e53)', category: 'food' },
    { icon: 'fa-hiking', gradient: 'linear-gradient(135deg, #00c853, #64dd17)', category: 'travel' },
    { icon: 'fa-palette', gradient: 'linear-gradient(135deg, #ffab00, #ffd600)', category: 'art' },
    { icon: 'fa-running', gradient: 'linear-gradient(135deg, #2979ff, #00b0ff)', category: 'fitness' },
    { icon: 'fa-theater-masks', gradient: 'linear-gradient(135deg, #e91e63, #f48fb1)', category: 'entertainment' },
  ]

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search users, posts, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2 && searchResults) {
                setShowResults(true)
              }
            }}
            className="w-full bg-medium-gray text-text-light px-4 py-3 pl-12 rounded-xl border border-light-gray focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-text-gray"></i>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchResults(null)
                setShowResults(false)
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-gray hover:text-text-light"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="search-results-container absolute top-full left-0 right-0 mt-2 bg-medium-gray rounded-xl border border-light-gray shadow-2xl z-50 max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="p-8 text-center text-text-gray">
                <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Searching...</p>
              </div>
            ) : searchResults ? (
              <div>
                {/* Users Results */}
                {searchResults.users && searchResults.users.length > 0 && (
                  <div className="p-3 border-b border-light-gray">
                    <h4 className="text-sm font-semibold text-text-gray mb-2 px-2">
                      <i className="fas fa-users mr-2"></i>Users
                    </h4>
                    <div className="space-y-2">
                      {searchResults.users.map((user: any) => (
                        <div
                          key={user._id}
                          onClick={() => handleUserClick(user._id)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-gray cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{user.fullName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{user.fullName || user.username}</p>
                              {user.isVerified && (
                                <i className="fas fa-check-circle text-primary-light text-xs"></i>
                              )}
                            </div>
                            {user.username && (
                              <p className="text-sm text-text-gray truncate">@{user.username}</p>
                            )}
                            {user.bio && (
                              <p className="text-xs text-text-gray truncate mt-1">{user.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags Results */}
                {searchResults.hashtags && searchResults.hashtags.length > 0 && (
                  <div className="p-3 border-b border-light-gray">
                    <h4 className="text-sm font-semibold text-text-gray mb-2 px-2">
                      <i className="fas fa-hashtag mr-2"></i>Hashtags
                    </h4>
                    <div className="space-y-1">
                      {searchResults.hashtags.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => handleHashtagClick(item.tag)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-gray cursor-pointer transition-colors"
                        >
                          <span className="text-primary-light font-medium">{item.tag}</span>
                          <span className="text-sm text-text-gray">{item.count} posts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Results */}
                {searchResults.posts && searchResults.posts.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-text-gray mb-2 px-2">
                      <i className="fas fa-images mr-2"></i>Posts
                    </h4>
                    <div className="grid grid-cols-3 gap-1">
                      {searchResults.posts.slice(0, 9).map((post: any) => (
                        <div
                          key={post._id}
                          onClick={() => handlePostClick(post._id)}
                          className="aspect-square bg-dark-gray rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {post.content?.media && post.content.media.length > 0 ? (
                            <img
                              src={post.content.media[0]}
                              alt="Post"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-gray">
                              <i className="fas fa-image text-2xl"></i>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {searchResults.posts.length > 9 && (
                      <p className="text-xs text-text-gray text-center mt-2">
                        +{searchResults.posts.length - 9} more posts
                      </p>
                    )}
                  </div>
                )}

                {/* No Results */}
                {(!searchResults.users || searchResults.users.length === 0) &&
                 (!searchResults.hashtags || searchResults.hashtags.length === 0) &&
                 (!searchResults.posts || searchResults.posts.length === 0) && (
                  <div className="p-8 text-center text-text-gray">
                    <i className="fas fa-search text-3xl mb-2"></i>
                    <p>No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-hashtag text-primary-light"></i>
          Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.length > 0 ? (
            trendingTopics.map((topic, index) => (
              <span
                key={index}
                className="bg-light-gray px-4 py-2 rounded-full text-sm hover:bg-primary hover:text-white transition-colors cursor-pointer"
              >
                {topic.tag || topic} {topic.count && `(${topic.count})`}
              </span>
            ))
          ) : (
            ['#WeekendVibes', '#CoffeeLovers', '#WorkFromCafe', '#LocalBusiness'].map((tag, index) => (
              <span
                key={index}
                className="bg-light-gray px-4 py-2 rounded-full text-sm hover:bg-primary hover:text-white transition-colors cursor-pointer"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      {/* MOxE Store */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-store text-primary-light"></i>
            MOxE Store
          </h3>
          <button
            onClick={() => navigate('/store')}
            className="text-primary-light hover:text-primary transition-colors text-sm font-semibold"
          >
            View All <i className="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
        <p className="text-sm text-text-gray mb-4">
          Shop the best deals on electronics, fashion, home & more
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Electronics', icon: 'fa-mobile-alt', color: 'from-blue-500 to-blue-600' },
            { name: 'Fashion', icon: 'fa-tshirt', color: 'from-pink-500 to-pink-600' },
            { name: 'Home', icon: 'fa-home', color: 'from-green-500 to-green-600' },
            { name: 'Books', icon: 'fa-book', color: 'from-purple-500 to-purple-600' },
          ].map((category, index) => (
            <div
              key={index}
              onClick={() => navigate('/store')}
              className={`bg-gradient-to-br ${category.color} rounded-xl p-4 cursor-pointer hover:opacity-90 transition-opacity`}
            >
              <i className={`fas ${category.icon} text-white text-2xl mb-2`}></i>
              <p className="text-white font-semibold text-sm">{category.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Discover */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-compass text-primary-light"></i>
          Discover
        </h3>
        <div className="grid grid-cols-3 gap-0.5">
          {discoverCategories.map((category, index) => (
            <div
              key={index}
              className="aspect-square flex items-center justify-center text-white text-2xl cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: category.gradient }}
              onClick={async () => {
                try {
                  const response = await api.get(`/explore/discover?category=${category.category}`)
                  console.log('Discover content:', response.data)
                  // TODO: Navigate to discover page or show content
                } catch (error) {
                  console.error('Failed to discover content:', error)
                }
              }}
            >
              <i className={`fas ${category.icon}`}></i>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
