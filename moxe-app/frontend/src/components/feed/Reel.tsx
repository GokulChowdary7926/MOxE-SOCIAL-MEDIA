import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store'
import { likePost } from '../../store/slices/postSlice'
import { useSocket } from '../../hooks/useSocket'
import ReelMenu from './ReelMenu'
import api from '../../services/api'

interface ReelProps {
  reel: {
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
      media: Array<{
        url: string
        type: 'video'
      }>
    }
    engagement: {
      likes: string[]
      comments: number
      shares?: number
    }
    createdAt: string
  }
  isActive: boolean
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d`
}

export default function Reel({ reel, isActive }: ReelProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [isLiked, setIsLiked] = useState(reel.engagement.likes.includes(user?._id || ''))
  const [likeCount, setLikeCount] = useState(reel.engagement.likes.length)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(console.error)
    } else if (videoRef.current) {
      videoRef.current.pause()
    }
  }, [isActive])

  useEffect(() => {
    if (!isConnected || !socket) return

    socket.on('post_liked', (data: any) => {
      if (data.postId === reel._id) {
        setLikeCount(data.engagement?.likes?.length || likeCount + 1)
      }
    })

    return () => {
      socket.off('post_liked')
    }
  }, [isConnected, socket, reel._id, likeCount])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1))
    dispatch(likePost(reel._id))
    
    if (socket && isConnected && !isLiked) {
      socket.emit('live_reaction', {
        postId: reel._id,
        reactionType: 'heart',
      })
    }
  }

  const handleShare = async () => {
    try {
      await api.post(`/posts/${reel._id}/share`)
      const reelUrl = `${window.location.origin}/reel/${reel._id}`
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reelUrl)
      }
    } catch (error) {
      console.error('Failed to share reel:', error)
    }
  }

  const handleComment = () => {
    // Open comment modal
  }

  const videoUrl = reel.content.media?.[0]?.url

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        loop
        muted={isMuted}
        playsInline
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Top Right Menu */}
      <div className="absolute top-4 right-4 z-20">
        <ReelMenu 
          reelId={reel._id}
          authorId={reel.author._id || (reel.author as any)._id}
          onReelDeleted={() => {
            window.location.reload()
          }}
          onReelArchived={() => {
            alert('Reel archived successfully')
          }}
          onReelHidden={() => {
            alert('Reel hidden from your feed')
          }}
        />
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-20 z-10 flex flex-col items-center gap-6">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isLiked ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'
          }`}>
            <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-white text-xl`}></i>
          </div>
          <span className="text-white text-xs font-semibold">{likeCount.toLocaleString()}</span>
        </button>

        <button
          onClick={handleComment}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <i className="far fa-comment text-white text-xl"></i>
          </div>
          <span className="text-white text-xs font-semibold">{reel.engagement.comments}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <i className="far fa-paper-plane text-white text-xl"></i>
          </div>
          <span className="text-white text-xs font-semibold">{reel.engagement.shares || 0}</span>
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <i className={`fas fa-volume-${isMuted ? 'mute' : 'up'} text-white text-xl`}></i>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold overflow-hidden">
            {reel.author.profile.avatar ? (
              <img 
                src={reel.author.profile.avatar} 
                alt={reel.author.profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              reel.author.profile.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{reel.author.profile.fullName}</p>
            <p className="text-white/70 text-xs">{formatTimeAgo(reel.createdAt)}</p>
          </div>
          {!isFollowing && (
            <button
              onClick={() => setIsFollowing(true)}
              className="px-4 py-1.5 bg-primary text-white rounded-full text-sm font-semibold"
            >
              Follow
            </button>
          )}
        </div>
        {reel.content.text && (
          <p className="text-white text-sm line-clamp-2">
            {reel.content.text}
          </p>
        )}
      </div>
    </div>
  )
}

