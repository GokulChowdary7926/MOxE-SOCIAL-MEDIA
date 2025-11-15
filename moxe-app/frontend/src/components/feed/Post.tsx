import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store'
import { likePost, dislikePost } from '../../store/slices/postSlice'
import CommentSection from './CommentSection'
import { useSocket } from '../../hooks/useSocket'
import LiveReactions from './LiveReactions'
import PostMenu from './PostMenu'
import api from '../../services/api'
import { formatTimeAgo } from '../../utils/helpers'

interface PostProps {
  post: {
    _id: string
    author: {
      profile: {
        username: string
        fullName: string
        avatar?: string
      }
      subscription: {
        tier: string
      }
    }
    content: {
      text?: string
      media?: Array<{
        url: string
        type: 'image' | 'video'
      }>
    }
    visibility?: {
      type: 'public' | 'followers' | 'close_friends' | 'private' | 'only_me'
    }
    engagement: {
      likes: string[]
      dislikes: string[]
      comments: number
      shares?: number
    }
    createdAt: string
    contentType?: 'post' | 'story' | 'reel' | 'live'
  }
}

// Keep the old function for backward compatibility, but prefer the imported one
const formatTimeAgoLocal = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`
  }
  
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}mo`
  }
  
  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y`
}

export default function Post({ post }: PostProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [isLiked, setIsLiked] = useState(post.engagement.likes.includes(user?._id || ''))
  const [isDisliked, setIsDisliked] = useState(post.engagement.dislikes.includes(user?._id || ''))
  const [likeCount, setLikeCount] = useState(post.engagement.likes.length)
  const [dislikeCount, setDislikeCount] = useState(post.engagement.dislikes.length)
  const [isSaved, setIsSaved] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Listen for real-time updates
  useEffect(() => {
    if (!isConnected || !socket) return

    socket.on('post_liked', (data: any) => {
      if (data.postId === post._id) {
        setLikeCount(data.engagement?.likes?.length || likeCount + 1)
      }
    })

    socket.on('post_disliked', (data: any) => {
      if (data.postId === post._id) {
        setDislikeCount(data.engagement?.dislikes?.length || dislikeCount + 1)
      }
    })

    return () => {
      socket.off('post_liked')
      socket.off('post_disliked')
    }
  }, [isConnected, socket, post._id, likeCount, dislikeCount])

  const handleLike = () => {
    if (isDisliked) {
      setIsDisliked(false)
      setDislikeCount((prev) => Math.max(0, prev - 1))
    }
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1))
    dispatch(likePost(post._id))
    
    // Send live reaction
    if (socket && isConnected && !isLiked) {
      socket.emit('live_reaction', {
        postId: post._id,
        reactionType: 'heart',
      })
    }
  }

  const handleDislike = () => {
    if (isLiked) {
      setIsLiked(false)
      setLikeCount((prev) => Math.max(0, prev - 1))
    }
    setIsDisliked(!isDisliked)
    setDislikeCount((prev) => (isDisliked ? Math.max(0, prev - 1) : prev + 1))
    dispatch(dislikePost(post._id))
  }

  const handleSave = async () => {
    try {
      await api.post(`/posts/${post._id}/save`)
      setIsSaved(!isSaved)
    } catch (error: any) {
      console.error('Failed to save post:', error)
    }
  }

  const handleShare = async () => {
    try {
      await api.post(`/posts/${post._id}/share`)
      const postUrl = `${window.location.origin}/post/${post._id}`
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl)
      }
    } catch (error: any) {
      console.error('Failed to share post:', error)
    }
  }

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  const media = post.content.media || []
  const hasMultipleMedia = media.length > 1

  return (
    <article className="bg-dark-gray border-b border-light-gray/10">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold overflow-hidden">
              {post.author.profile.avatar ? (
                <img 
                  src={post.author.profile.avatar} 
                  alt={post.author.profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.author.profile.fullName.charAt(0).toUpperCase()
              )}
            </div>
            {post.author.subscription.tier === 'star' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full border-2 border-dark-gray flex items-center justify-center">
                <i className="fas fa-star text-[8px] text-black"></i>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm truncate">
                {post.author.profile.fullName}
              </h3>
              {(post.author as any).isBusiness && (
                <i className="fas fa-check-circle text-primary text-xs" title="Verified Business"></i>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-gray">
              <span>{formatTimeAgoLocal(post.createdAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <i className={`fas ${
                  post.visibility?.type === 'public' ? 'fa-globe-americas' :
                  post.visibility?.type === 'followers' ? 'fa-users' :
                  post.visibility?.type === 'close_friends' ? 'fa-star' :
                  post.visibility?.type === 'private' ? 'fa-lock' : 'fa-user-secret'
                } text-[10px]`}></i>
              </span>
            </div>
          </div>
        </div>
        <PostMenu 
          postId={post._id}
          authorId={post.author._id || (post.author as any)._id}
          onPostDeleted={() => {
            // Refresh feed or remove post from view
            window.location.reload()
          }}
          onPostArchived={() => {
            alert('Post archived successfully')
          }}
          onPostHidden={() => {
            alert('Post hidden from your feed')
          }}
        />
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div className="relative w-full bg-black">
          <LiveReactions postId={post._id} />
          
          {/* Media Indicators */}
          {hasMultipleMedia && (
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              {media.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentMediaIndex(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentMediaIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* DSR Protection Badge */}
          {(post.content as any).dsrProtected && (
            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <i className="fas fa-shield-alt text-[10px]"></i>
              <span>DSR Protected</span>
            </div>
          )}

          {/* Media Display */}
          <div className="relative">
            {media[currentMediaIndex]?.type === 'image' ? (
              <img
                src={media[currentMediaIndex].url}
                alt="Post media"
                className="w-full object-contain max-h-[600px] bg-black"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={media[currentMediaIndex].url}
                  className="w-full max-h-[600px] object-contain bg-black"
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    (e.target as HTMLVideoElement).style.display = 'none'
                  }}
                />
                {!isVideoPlaying && (
                  <button
                    onClick={handleVideoPlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <i className="fas fa-play text-primary text-xl ml-1"></i>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Media Navigation */}
          {hasMultipleMedia && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex(currentMediaIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                >
                  <i className="fas fa-chevron-left text-sm"></i>
                </button>
              )}
              {currentMediaIndex < media.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex(currentMediaIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                >
                  <i className="fas fa-chevron-right text-sm"></i>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Engagement Metrics - Top */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-text-gray text-sm">
          {likeCount > 0 && (
            <span className="text-white">
              {likeCount.toLocaleString()} likes
            </span>
          )}
          {likeCount > 0 && post.engagement.comments > 0 && <span> • </span>}
          {post.engagement.comments > 0 && (
            <span className="text-white">
              {post.engagement.comments} comments
            </span>
          )}
          {dislikeCount > 0 && (likeCount > 0 || post.engagement.comments > 0) && <span> • </span>}
          {dislikeCount > 0 && (
            <span className="text-white">
              {dislikeCount} dislikes
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons - Bottom Row */}
      <div className="px-4 py-2 border-t border-light-gray/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-white'}`}
            >
              <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl ${isLiked ? 'animate-pulse' : ''}`}></i>
              <span className="text-sm font-medium">{likeCount > 0 ? likeCount.toLocaleString() : ''}</span>
            </button>
            <button
              onClick={handleDislike}
              className={`flex items-center gap-2 transition-all active:scale-90 ${isDisliked ? 'text-warning' : 'text-white'}`}
            >
              <i className={`fas fa-thumbs-down text-xl`}></i>
              <span className="text-sm font-medium">{dislikeCount > 0 ? dislikeCount : ''}</span>
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-white transition-all active:scale-90"
            >
              <i className="far fa-comment text-xl"></i>
              <span className="text-sm font-medium">{post.engagement.comments > 0 ? post.engagement.comments : ''}</span>
            </button>
            <button
              onClick={handleShare}
              className="text-white transition-all active:scale-90"
            >
              <i className="far fa-share-square text-xl"></i>
            </button>
          </div>
          <button
            onClick={handleSave}
            className={`transition-all active:scale-90 ${isSaved ? 'text-yellow-400' : 'text-white'}`}
          >
            <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-xl`}></i>
          </button>
        </div>
      </div>

      {/* Caption and Time */}
      <div className="px-4 pb-3">
        {post.content.text && (
          <div className="mb-2">
            <p className="text-white text-sm">
              <span className="font-semibold mr-2">{post.author.profile.fullName}</span>
              {post.content.text}
            </p>
          </div>
        )}

        {/* View Comments */}
        {post.engagement.comments > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="text-text-gray text-sm mb-2 hover:text-white transition-colors"
          >
            View all {post.engagement.comments} {post.engagement.comments === 1 ? 'comment' : 'comments'}
          </button>
        )}

        {/* Time */}
        <p className="text-text-gray text-xs uppercase">
          {formatTimeAgoLocal(post.createdAt)}
        </p>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-light-gray/10 pt-2">
          <CommentSection postId={post._id} />
        </div>
      )}
    </article>
  )
}
