import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { AppDispatch, RootState } from '../store'
import { fetchProfile } from '../store/slices/userSlice'
import api from '../services/api'

export default function Profile() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId?: string }>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { profile } = useSelector((state: RootState) => state.user)
  const [activeTab, setActiveTab] = useState('post')
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [reels, setReels] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [collections] = useState<any[]>([])
  const [taggedPosts, setTaggedPosts] = useState<any[]>([])
  const [viewedUser, setViewedUser] = useState<any>(null)

  const displayUser = viewedUser || profile || user
  
  // Check if viewing own profile or another user's profile
  const currentUserId = user?._id
  const isOwnProfile = !userId || (currentUserId && userId && currentUserId.toString() === userId.toString())

  useEffect(() => {
    if (userId && userId !== currentUserId) {
      // Loading another user's profile
      loadOtherUserProfile(userId)
    } else {
      // Loading own profile
      dispatch(fetchProfile())
    }
    loadUserPosts()
    loadReels()
    loadSavedPosts()
    loadTaggedPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userId, currentUserId])

  const loadOtherUserProfile = async (targetUserId: string) => {
    try {
      const response = await api.get(`/users/${targetUserId}`)
      setViewedUser(response.data.user)
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  const loadUserPosts = async () => {
    try {
      const targetUserId = userId || user?._id
      const response = await api.get(`/posts/user/${targetUserId}`)
      setUserPosts(response.data.posts || [])
    } catch (error) {
      console.error('Failed to load posts:', error)
      // Use fallback data
      setUserPosts([
        {
          _id: '1',
          title: 'Hiking in north bay',
          author: 'Freya',
          views: 438,
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        },
        {
          _id: '2',
          title: 'Bought a new house',
          author: 'Freya',
          views: 293,
          image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop',
        },
        {
          _id: '3',
          title: 'Cooking my favorite recipe',
          author: 'Freya',
          views: 842,
          image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop',
        },
        {
          _id: '4',
          title: 'Got some new plants',
          author: 'Freya',
          views: 748,
          image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
        },
      ])
    }
  }

  const loadReels = async () => {
    try {
      const targetUserId = userId || user?._id
      const response = await api.get(`/posts/reels?userId=${targetUserId}`).catch(() => ({ data: { reels: [] } }))
      setReels(response.data.reels || [])
    } catch (error) {
      console.error('Failed to load reels:', error)
      setReels([])
    }
  }

  const loadSavedPosts = async () => {
    try {
      // Only load saved posts for own profile
      if (isOwnProfile) {
        const response = await api.get('/posts/saved').catch(() => ({ data: { posts: [] } }))
        setSavedPosts(response.data.posts || [])
      } else {
        setSavedPosts([])
      }
    } catch (error) {
      console.error('Failed to load saved posts:', error)
      setSavedPosts([])
    }
  }

  const loadTaggedPosts = async () => {
    try {
      const targetUserId = userId || user?._id
      const response = await api.get(`/posts/tagged?userId=${targetUserId}`).catch(() => ({ data: { posts: [] } }))
      setTaggedPosts(response.data.posts || [])
    } catch (error) {
      console.error('Failed to load tagged posts:', error)
      setTaggedPosts([])
    }
  }

  // Mock data for profile details
  const profileDetails = {
    location: displayUser?.profile?.location || 'San Francisco',
    relationship: 'Engaged',
    workplace: 'Netflix',
    interests: ['Web designer', 'Artist', 'Hiking', 'Tennis', 'Roadtrip', 'Cooking', 'Poker'],
  }

  const stats = {
    following: 85,
    followers: 1091,
    likes: 4384,
  }

  return (
    <div className="min-h-screen bg-dark pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-4 bg-medium-gray">
        <button onClick={() => navigate(-1)} className="text-white">
          <i className="fas fa-arrow-left text-xl"></i>
        </button>
        <div className="w-6"></div> {/* Spacer for centering */}
      </div>

      {/* Profile Header */}
      <div className="bg-medium-gray rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          {/* Profile Picture */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold overflow-hidden flex-shrink-0">
            {displayUser?.profile?.avatar ? (
              <img
                src={displayUser.profile.avatar}
                alt={displayUser.profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{displayUser?.profile?.fullName?.charAt(0) || displayUser?.profile?.username?.charAt(0) || 'U'}</span>
            )}
          </div>

          {/* Name and Bio */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">
              {displayUser?.profile?.fullName || displayUser?.profile?.username || 'User'}
            </h2>
            <p className="text-sm text-text-gray">
              {displayUser?.profile?.bio || 'Futuristic dreamer'}
            </p>
          </div>
        </div>

        {/* Action Buttons - Only show for other users' profiles */}
        {!isOwnProfile && (
          <div className="flex gap-3 mt-4">
            <button className="flex-1 bg-light-gray text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-medium-gray transition-colors">
              Add Friend
            </button>
            <button 
              onClick={() => navigate('/messages')}
              className="flex-1 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Message
            </button>
          </div>
        )}
      </div>

      {/* Personal Details */}
      <div className="bg-medium-gray rounded-2xl p-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-text-light">
            <i className="fas fa-home text-primary-light w-5"></i>
            <span className="text-sm">Lives in {profileDetails.location}</span>
          </div>
          <div className="flex items-center gap-3 text-text-light">
            <i className="fas fa-heart text-primary-light w-5"></i>
            <span className="text-sm">{profileDetails.relationship}</span>
          </div>
          <div className="flex items-center gap-3 text-text-light">
            <i className="fas fa-briefcase text-primary-light w-5"></i>
            <span className="text-sm">Works at {profileDetails.workplace}</span>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="bg-medium-gray rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {profileDetails.interests.map((interest, index) => {
            const icons: { [key: string]: string } = {
              'Web designer': 'fa-globe',
              Artist: 'fa-palette',
              Hiking: 'fa-hiking',
              Tennis: 'fa-table-tennis',
              Roadtrip: 'fa-car',
              Cooking: 'fa-utensils',
              Poker: 'fa-dice',
            }
            return (
              <div
                key={index}
                className="bg-dark-gray px-4 py-2 rounded-full flex items-center gap-2 hover:bg-light-gray transition-colors cursor-pointer"
              >
                <i className={`fas ${icons[interest] || 'fa-star'} text-primary-light text-xs`}></i>
                <span className="text-sm text-white">{interest}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-medium-gray rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-gray rounded-lg p-4 text-center hover:bg-light-gray transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-white mb-1">{stats.following}</div>
            <div className="text-xs text-text-gray">Following</div>
          </div>
          <div className="bg-dark-gray rounded-lg p-4 text-center hover:bg-light-gray transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-white mb-1">{stats.followers}</div>
            <div className="text-xs text-text-gray">Followers</div>
          </div>
          <div className="bg-dark-gray rounded-lg p-4 text-center hover:bg-light-gray transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-white mb-1">{stats.likes}</div>
            <div className="text-xs text-text-gray">Likes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-medium-gray rounded-2xl overflow-hidden">
        <div className="flex border-b border-light-gray overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-shrink-0 px-4 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'post'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-text-gray'
            }`}
          >
            POST
          </button>
          <button
            onClick={() => setActiveTab('reel')}
            className={`flex-shrink-0 px-4 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'reel'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-text-gray'
            }`}
          >
            REEL
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-shrink-0 px-4 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'save'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-text-gray'
            }`}
          >
            SAVE
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex-shrink-0 px-4 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'collection'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-text-gray'
            }`}
          >
            COLLECTION
          </button>
          <button
            onClick={() => setActiveTab('tag')}
            className={`flex-shrink-0 px-4 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'tag'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-text-gray'
            }`}
          >
            TAG
          </button>
        </div>

        {/* POST Grid */}
        {activeTab === 'post' && (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <div
                  key={post._id}
                  className="bg-dark-gray aspect-square relative overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/post/${post._id}`)}
                >
                  <img
                    src={post.image || post.content?.media?.[0]?.url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/400x400?text=Post'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <h4 className="text-white text-sm font-semibold mb-1 truncate">{post.title}</h4>
                    <div className="flex items-center justify-between text-xs text-text-gray">
                      <span>{post.author || displayUser?.profile?.fullName}</span>
                      <span>{post.views || 0} views</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-text-gray">
                <i className="fas fa-image text-4xl mb-4"></i>
                <p>No posts yet</p>
              </div>
            )}
          </div>
        )}

        {/* REEL Grid */}
        {activeTab === 'reel' && (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {reels.length > 0 ? (
              reels.map((reel) => (
                <div
                  key={reel._id}
                  className="bg-dark-gray aspect-square relative overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/reel/${reel._id}`)}
                >
                  <img
                    src={reel.content?.media?.[0]?.url || reel.thumbnail}
                    alt="Reel"
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/400x400?text=Reel'
                    }}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs">
                    <i className="fas fa-play"></i>
                    <span>{reel.views || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-text-gray">
                <i className="fas fa-video text-4xl mb-4"></i>
                <p>No reels yet</p>
              </div>
            )}
          </div>
        )}

        {/* SAVE Grid */}
        {activeTab === 'save' && (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {savedPosts.length > 0 ? (
              savedPosts.map((post) => (
                <div
                  key={post._id}
                  className="bg-dark-gray aspect-square relative overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/post/${post._id}`)}
                >
                  <img
                    src={post.content?.media?.[0]?.url || post.image}
                    alt="Saved post"
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/400x400?text=Saved'
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <i className="fas fa-bookmark text-primary-light"></i>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-text-gray">
                <i className="fas fa-bookmark text-4xl mb-4"></i>
                <p>No saved posts yet</p>
              </div>
            )}
          </div>
        )}

        {/* COLLECTION Grid */}
        {activeTab === 'collection' && (
          <div className="p-4">
            {collections.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {collections.map((collection) => (
                  <div
                    key={collection._id}
                    className="bg-dark-gray rounded-lg p-4 cursor-pointer hover:bg-light-gray transition-colors"
                    onClick={() => navigate(`/collection/${collection._id}`)}
                  >
                    <div className="aspect-square bg-medium-gray rounded-lg mb-2 flex items-center justify-center">
                      <i className="fas fa-folder text-4xl text-primary-light"></i>
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{collection.name}</h4>
                    <p className="text-xs text-text-gray">{collection.posts?.length || 0} posts</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-text-gray py-8">
                <i className="fas fa-folder-open text-4xl mb-4"></i>
                <p>No collections yet</p>
                <p className="text-xs mt-1">Create collections to organize your posts</p>
              </div>
            )}
          </div>
        )}

        {/* TAG Grid */}
        {activeTab === 'tag' && (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {taggedPosts.length > 0 ? (
              taggedPosts.map((post) => (
                <div
                  key={post._id}
                  className="bg-dark-gray aspect-square relative overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/post/${post._id}`)}
                >
                  <img
                    src={post.content?.media?.[0]?.url || post.image}
                    alt="Tagged post"
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/400x400?text=Tagged'
                    }}
                  />
                  <div className="absolute top-2 left-2">
                    <i className="fas fa-user-tag text-primary-light"></i>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-text-gray">
                <i className="fas fa-user-tag text-4xl mb-4"></i>
                <p>No tagged posts yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
