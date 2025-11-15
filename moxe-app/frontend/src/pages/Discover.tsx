import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import api from '../services/api'
import Post from '../components/feed/Post'

export default function Discover() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'people' | 'hashtags' | 'locations'>('for-you')
  const [posts, setPosts] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [hashtags, setHashtags] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDiscoverContent()
  }, [activeTab])

  const loadDiscoverContent = async () => {
    setIsLoading(true)
    try {
      switch (activeTab) {
        case 'for-you':
          const forYouRes = await api.get('/discover/for-you')
          setPosts(forYouRes.data.posts || [])
          break
        case 'trending':
          const trendingRes = await api.get('/discover/trending')
          setTrending(trendingRes.data.trending || [])
          break
        case 'people':
          const peopleRes = await api.get('/discover/people')
          setPeople(peopleRes.data.users || [])
          break
        case 'hashtags':
          const hashtagsRes = await api.get('/discover/hashtags')
          setHashtags(hashtagsRes.data.hashtags || [])
          break
      }
    } catch (error) {
      console.error('Failed to load discover content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`)
      setPosts(response.data.posts || [])
      setPeople(response.data.users || [])
      setHashtags(response.data.hashtags || [])
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-4">Discover</h1>
        
        {/* Search Bar */}
        <div className="bg-medium-gray rounded-xl p-3 flex items-center gap-3">
          <i className="fas fa-search text-text-gray"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users, posts, hashtags..."
            className="flex-1 bg-transparent text-white placeholder-text-gray outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                loadDiscoverContent()
              }}
              className="text-text-gray hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-medium-gray rounded-2xl p-1 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('for-you')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'for-you'
              ? 'bg-primary text-white'
              : 'bg-transparent text-text-gray'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'trending'
              ? 'bg-primary text-white'
              : 'bg-transparent text-text-gray'
          }`}
        >
          Trending
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'people'
              ? 'bg-primary text-white'
              : 'bg-transparent text-text-gray'
          }`}
        >
          People
        </button>
        <button
          onClick={() => setActiveTab('hashtags')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'hashtags'
              ? 'bg-primary text-white'
              : 'bg-transparent text-text-gray'
          }`}
        >
          Hashtags
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
        </div>
      ) : (
        <>
          {activeTab === 'for-you' && (
            <div className="space-y-4">
              {posts.map((post) => (
                <Post key={post._id} post={post} />
              ))}
              {posts.length === 0 && (
                <div className="bg-medium-gray rounded-2xl p-8 text-center">
                  <i className="fas fa-compass text-text-gray text-4xl mb-4"></i>
                  <p className="text-text-gray">No content to discover yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trending' && (
            <div className="space-y-3">
              {trending.map((item, index) => (
                <div key={index} className="bg-medium-gray rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{item.hashtag || item.topic}</p>
                        <p className="text-text-gray text-xs">{item.count} posts</p>
                      </div>
                    </div>
                    <button className="text-primary text-sm font-medium">Follow</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'people' && (
            <div className="space-y-3">
              {people.map((person) => (
                <div key={person._id} className="bg-medium-gray rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {person.profile?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{person.profile?.fullName}</p>
                        <p className="text-text-gray text-xs">@{person.profile?.username}</p>
                        <p className="text-text-gray text-xs">{person.followersCount || 0} followers</p>
                      </div>
                    </div>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">
                      Follow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hashtags' && (
            <div className="space-y-3">
              {hashtags.map((hashtag) => (
                <div key={hashtag._id} className="bg-medium-gray rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary font-semibold text-lg">#{hashtag.name}</p>
                      <p className="text-text-gray text-sm">{hashtag.postCount || 0} posts</p>
                    </div>
                    <button className="text-primary text-sm font-medium">Follow</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

