import { useState, useEffect, useRef } from 'react'

interface Story {
  _id: string
  author: {
    profile: {
      fullName: string
      username: string
      avatar?: string
    }
  }
  content: {
    media: Array<{
      url: string
      type: 'image' | 'video'
    }>
    text?: string
  }
  createdAt: string
  expiresAt: string
}

interface StoryViewerProps {
  stories: Story[]
  initialIndex: number
  onClose: () => void
}

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentStory = stories[currentStoryIndex]
  const currentMedia = currentStory?.content?.media?.[currentMediaIndex]

  useEffect(() => {
    if (isPaused || !currentMedia) return

    const duration = 5000 // 5 seconds per story
    const interval = 100 // Update every 100ms

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + (interval / duration) * 100
      })
    }, interval)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [currentStoryIndex, currentMediaIndex, isPaused, currentMedia])

  useEffect(() => {
    if (currentMedia?.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(console.error)
    }
  }, [currentMedia])

  const handleNext = () => {
    if (currentMediaIndex < (currentStory?.content?.media?.length || 1) - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1)
      setProgress(0)
    } else if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
      setCurrentMediaIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1)
      setProgress(0)
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
      const prevStory = stories[currentStoryIndex - 1]
      setCurrentMediaIndex((prevStory?.content?.media?.length || 1) - 1)
      setProgress(0)
    }
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }

  if (!currentStory || !currentMedia) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onClick={handlePause}
      style={{ touchAction: 'none' }}
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 space-y-1">
        {stories.map((story, index) => (
          <div key={story._id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full bg-white transition-all ${
                index === currentStoryIndex ? 'duration-100' : index < currentStoryIndex ? 'w-full' : 'w-0'
              }`}
              style={{
                width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-12 left-0 right-0 z-10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold overflow-hidden">
            {currentStory.author.profile.avatar ? (
              <img 
                src={currentStory.author.profile.avatar} 
                alt={currentStory.author.profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              currentStory.author.profile.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.author.profile.fullName}</p>
            <p className="text-white/70 text-xs">2h</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:opacity-70 transition-opacity"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentMedia.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt="Story"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentMedia.url}
            className="w-full h-full object-contain"
            loop
            muted
            playsInline
            onEnded={handleNext}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="absolute inset-0 flex">
        <button
          onClick={handlePrevious}
          className="flex-1"
          style={{ touchAction: 'manipulation' }}
        />
        <button
          onClick={handleNext}
          className="flex-1"
          style={{ touchAction: 'manipulation' }}
        />
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center gap-4 justify-center">
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <i className="far fa-heart text-xl"></i>
          </button>
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <i className="far fa-comment text-xl"></i>
          </button>
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <i className="far fa-paper-plane text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

