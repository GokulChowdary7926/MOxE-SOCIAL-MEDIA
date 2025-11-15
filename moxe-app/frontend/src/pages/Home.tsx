import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../store'
import { fetchFeed, addPost } from '../store/slices/postSlice'
import Stories from '../components/feed/Stories'
import CreatePost from '../components/feed/CreatePost'
import Post from '../components/feed/Post'
import Reel from '../components/feed/Reel'
import LiveStream from '../components/feed/LiveStream'
import { useSocket } from '../hooks/useSocket'
import Loader from '../components/common/Loader'

export default function Home() {
  const dispatch = useDispatch<AppDispatch>()
  const { posts, stories, isLoading } = useSelector((state: RootState) => state.posts)
  const { socket, isConnected } = useSocket()
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null)

  useEffect(() => {
    dispatch(fetchFeed())
  }, [dispatch])

  // Refresh feed when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchFeed())
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [dispatch])

  useEffect(() => {
    if (isConnected && socket) {
      // Listen for post_created event (when user creates a post)
      const handlePostCreated = (data: any) => {
        console.log('📱 Post created:', data)
        if (data.post) {
          dispatch(addPost(data.post))
        }
        setTimeout(() => {
          dispatch(fetchFeed())
        }, 500)
      }

      // Listen for new posts (from followers)
      const handleNewPost = (data: any) => {
        console.log('📱 New post from follower:', data)
        dispatch(fetchFeed())
      }

      // Listen for public posts
      const handleNewPostPublic = (data: any) => {
        console.log('🌐 New public post:', data)
        dispatch(fetchFeed())
      }

      // Listen for post likes
      const handlePostLiked = (data: any) => {
        console.log('❤️ Post liked:', data)
        dispatch(fetchFeed())
      }

      // Listen for post dislikes
      const handlePostDisliked = (data: any) => {
        console.log('👎 Post disliked:', data)
        dispatch(fetchFeed())
      }

      // Listen for new stories
      const handleNewStory = (data: any) => {
        console.log('📸 New story:', data)
        dispatch(fetchFeed())
      }
      
      socket.on('post_created', handlePostCreated)
      socket.on('new_post', handleNewPost)
      socket.on('new_post_public', handleNewPostPublic)
      socket.on('post_liked', handlePostLiked)
      socket.on('post_disliked', handlePostDisliked)
      socket.on('new_story', handleNewStory)

      // Listen for post shares
      const handlePostShared = (data: any) => {
        console.log('📤 Post shared:', data)
        dispatch(fetchFeed())
      }

      // Listen for new comments
      const handleNewComment = (data: any) => {
        console.log('💬 New comment:', data)
        dispatch(fetchFeed())
      }

      // Listen for live reactions
      const handleLiveReaction = (data: any) => {
        console.log('✨ Live reaction:', data)
      }

      // Listen for post saved updates
      const handlePostSaved = (data: any) => {
        console.log('🔖 Post saved:', data)
      }
      
      socket.on('post_shared', handlePostShared)
      socket.on('new_comment', handleNewComment)
      socket.on('live_reaction_received', handleLiveReaction)
      socket.on('post_saved_update', handlePostSaved)

      return () => {
        socket.off('post_created', handlePostCreated)
        socket.off('new_post', handleNewPost)
        socket.off('new_post_public', handleNewPostPublic)
        socket.off('post_liked', handlePostLiked)
        socket.off('post_disliked', handlePostDisliked)
        socket.off('new_story', handleNewStory)
        socket.off('post_shared', handlePostShared)
        socket.off('new_comment', handleNewComment)
        socket.off('live_reaction_received', handleLiveReaction)
        socket.off('post_saved_update', handlePostSaved)
      }
    }
  }, [isConnected, socket, dispatch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-gray">
        <Loader text="Loading feed..." size="lg" />
      </div>
    )
  }

  // Separate content by type
  const regularPosts = posts.filter((post: any) => 
    !post.contentType || post.contentType === 'post'
  )
  const reels = posts.filter((post: any) => post.contentType === 'reel')
  const liveStreams = posts.filter((post: any) => post.contentType === 'live')

  return (
    <div className="pb-20 bg-dark-gray min-h-screen">
      {/* Stories Section */}
      <Stories stories={stories} />

      {/* Create Post Button */}
      <div className="px-4 py-3">
        <CreatePost />
      </div>

      {/* Live Streams */}
      {liveStreams.length > 0 && (
        <div className="px-4 py-2 space-y-4">
          <h2 className="text-white font-semibold text-lg px-2">Live Now</h2>
          {liveStreams.map((stream: any) => (
            <LiveStream key={stream._id} stream={stream} />
          ))}
        </div>
      )}

      {/* Reels Section */}
      {reels.length > 0 && (
        <div className="px-4 py-2 space-y-4">
          <h2 className="text-white font-semibold text-lg px-2">Reels</h2>
          <div className="space-y-4">
            {reels.map((reel: any, index: number) => (
              <div key={reel._id} className="rounded-2xl overflow-hidden">
                <Reel 
                  reel={reel} 
                  isActive={activeReelIndex === index}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Posts */}
      <div className="space-y-0">
        {regularPosts.length === 0 && reels.length === 0 && liveStreams.length === 0 ? (
          <div className="text-center py-12 text-text-gray px-4">
            <i className="fas fa-inbox text-4xl mb-4 opacity-50"></i>
            <p className="text-lg mb-2">No posts yet</p>
            <p className="text-sm">Start following people to see their posts!</p>
          </div>
        ) : (
          regularPosts.map((post: any) => (
            <Post key={post._id} post={post} />
          ))
        )}
      </div>
    </div>
  )
}
