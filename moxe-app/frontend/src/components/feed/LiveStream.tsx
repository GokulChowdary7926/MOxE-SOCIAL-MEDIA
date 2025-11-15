import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { useSocket } from '../../hooks/useSocket'
import api from '../../services/api'

interface LiveStreamProps {
  stream: {
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
    }
    engagement: {
      viewers: number
      likes: number
    }
    startedAt: string
  }
}

export default function LiveStream({ stream }: LiveStreamProps) {
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [viewers, setViewers] = useState(stream.engagement.viewers)
  const [likes, setLikes] = useState(stream.engagement.likes)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isConnected || !socket) return

    socket.on('live_viewer_update', (data: any) => {
      if (data.streamId === stream._id) {
        setViewers(data.viewers)
      }
    })

    socket.on('live_like', (data: any) => {
      if (data.streamId === stream._id) {
        setLikes((prev) => prev + 1)
      }
    })

    return () => {
      socket.off('live_viewer_update')
      socket.off('live_like')
    }
  }, [isConnected, socket, stream._id])

  const handleLike = () => {
    if (socket && isConnected) {
      socket.emit('live_like', {
        streamId: stream._id,
      })
      setLikes((prev) => prev + 1)
    }
  }

  const handleShare = async () => {
    const streamUrl = `${window.location.origin}/live/${stream._id}`
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(streamUrl)
    }
  }

  const handleComment = () => {
    // Open comment modal
  }

  return (
    <div className="relative w-full bg-black aspect-[9/16] max-h-[600px] rounded-2xl overflow-hidden">
      {/* Live Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white text-xs font-semibold">LIVE</span>
        </div>
        <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
          <span className="text-white text-xs font-semibold">{viewers.toLocaleString()} watching</span>
        </div>
      </div>

      {/* Video Stream */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center text-white">
          <i className="fas fa-video text-4xl mb-2 opacity-50"></i>
          <p className="text-sm">Live Stream</p>
        </div>
        {/* In production, this would be the actual video stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted={isMuted}
          playsInline
        />
      </div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-20 z-10 flex flex-col items-center gap-4">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <i className="far fa-heart text-white text-xl"></i>
          </div>
          <span className="text-white text-xs font-semibold">{likes.toLocaleString()}</span>
        </button>

        <button
          onClick={handleComment}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <i className="far fa-comment text-white text-xl"></i>
        </button>

        <button
          onClick={handleShare}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <i className="far fa-paper-plane text-white text-xl"></i>
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <i className={`fas fa-volume-${isMuted ? 'mute' : 'up'} text-white text-xl`}></i>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold overflow-hidden">
            {stream.author.profile.avatar ? (
              <img 
                src={stream.author.profile.avatar} 
                alt={stream.author.profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              stream.author.profile.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{stream.author.profile.fullName}</p>
            <p className="text-white/70 text-xs">Started {new Date(stream.startedAt).toLocaleTimeString()}</p>
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
        {stream.content.text && (
          <p className="text-white text-sm line-clamp-2">
            {stream.content.text}
          </p>
        )}
      </div>
    </div>
  )
}

