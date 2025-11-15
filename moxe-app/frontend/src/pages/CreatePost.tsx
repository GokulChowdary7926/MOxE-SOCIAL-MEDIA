import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../store'
import { fetchFeed, addPost } from '../store/slices/postSlice'
import { useSocket } from '../hooks/useSocket'
import api from '../services/api'

export default function CreatePost() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel' | 'live'>('post')
  const [text, setText] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [dsrProtected, setDsrProtected] = useState(false)
  const [contentSettings, setContentSettings] = useState<any>(null)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mentions] = useState<string[]>([]) // Reserved for future mention functionality
  const [isLoading, setIsLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])

  // Load default content settings
  useEffect(() => {
    const loadContentSettings = async () => {
      try {
        const response = await api.get('/settings')
        if (response.data.contentSettings) {
          setContentSettings(response.data.contentSettings)
          // Set default visibility based on content type
          const defaultVisibility = 
            contentType === 'post' ? response.data.contentSettings.posts?.defaultVisibility || 'all' :
            contentType === 'reel' ? response.data.contentSettings.reels?.defaultVisibility || 'all' :
            contentType === 'story' ? response.data.contentSettings.stories?.defaultVisibility || 'all' :
            contentType === 'live' ? response.data.contentSettings.live?.defaultVisibility || 'all' :
            'all'
          setVisibility(defaultVisibility)
        }
      } catch (error) {
        console.error('Failed to load content settings:', error)
      }
    }
    loadContentSettings()
  }, [])

  // Update visibility when content type changes
  useEffect(() => {
    if (contentSettings) {
      const defaultVisibility = 
        contentType === 'post' ? contentSettings.posts?.defaultVisibility || 'all' :
        contentType === 'reel' ? contentSettings.reels?.defaultVisibility || 'all' :
        contentType === 'story' ? contentSettings.stories?.defaultVisibility || 'all' :
        contentType === 'live' ? contentSettings.live?.defaultVisibility || 'all' :
        'all'
      setVisibility(defaultVisibility)
    }
  }, [contentType, contentSettings])

  const handleHashtagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hashtags.length < 15) {
      const value = e.currentTarget.value.trim()
      if (value && !value.startsWith('#')) {
        const hashtag = `#${value.replace(/#/g, '')}`
        if (!hashtags.includes(hashtag)) {
          setHashtags([...hashtags, hashtag])
          e.currentTarget.value = ''
        }
      }
    }
  }

  const removeHashtag = (hashtag: string) => {
    setHashtags(hashtags.filter((h) => h !== hashtag))
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxFiles = contentType === 'story' ? 1 : 10
    const maxSizeMB = 10 // Maximum file size in MB (before base64 encoding)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (files.length > maxFiles) {
      alert(`You can only upload ${maxFiles} file(s) for ${contentType}`)
      e.target.value = '' // Clear input
      return
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes)
    if (oversizedFiles.length > 0) {
      alert(`File size too large. Maximum size is ${maxSizeMB}MB per file.`)
      e.target.value = '' // Clear input
      setMediaFiles([])
      return
    }

    setMediaFiles(files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text.trim() && mediaFiles.length === 0) {
      alert('Please add text or media to your post')
      return
    }

    setIsLoading(true)
    try {
      // Prepare media files for upload (if any)
      let mediaArray: any[] = []
      if (mediaFiles.length > 0) {
        // Check total size before converting (base64 increases size by ~33%)
        const totalSize = mediaFiles.reduce((sum, file) => sum + file.size, 0)
        const maxTotalSize = 40 * 1024 * 1024 // 40MB total (before base64)
        
        if (totalSize > maxTotalSize) {
          alert(`Total file size too large. Maximum total size is ${maxTotalSize / (1024 * 1024)}MB.`)
          setIsLoading(false)
          return
        }

        // Convert files to base64 data URLs
        try {
          mediaArray = await Promise.all(
            mediaFiles.map(async (file) => {
              return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  const isVideo = file.type.startsWith('video/')
                  const isImage = file.type.startsWith('image/')
                  
                  resolve({
                    url: result, // Base64 data URL
                    type: isVideo ? 'video' : isImage ? 'image' : 'file',
                    thumbnail: isVideo ? null : result, // For videos, thumbnail would need separate processing
                  })
                }
                reader.onerror = () => {
                  reject(new Error(`Failed to read file: ${file.name}`))
                }
                reader.readAsDataURL(file)
              })
            })
          )
        } catch (error: any) {
          alert(`Error processing files: ${error.message}`)
          setIsLoading(false)
          return
        }
      }

      // Prepare request payload
      const payload: any = {
        text: text.trim() || undefined,
        media: mediaArray.length > 0 ? mediaArray : undefined,
        visibility: visibility,
        contentType: contentType || 'post',
      }

      // Only include optional fields if they have values
      if (hashtags.length > 0) {
        payload.hashtags = hashtags
      }
      if (mentions.length > 0) {
        payload.mentions = mentions
      }
      if (dsrProtected) {
        payload.dsrProtected = true
      }

      // Remove undefined fields to reduce payload size
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key]
        }
      })

      console.log('Creating post with payload:', {
        ...payload,
        media: payload.media ? `${payload.media.length} media items` : 'none',
        mediaSize: payload.media ? payload.media.reduce((sum: number, m: any) => sum + (m.url?.length || 0), 0) : 0
      })

      const response = await api.post('/posts', payload, {
        timeout: 60000, // 60 second timeout for large media uploads
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Check if response is successful
      if (!response.data || !response.data.post) {
        throw new Error('Invalid response from server')
      }

      // Immediately add post to feed for instant UI update
      if (contentType === 'post' && response.data.post) {
        // Ensure post has proper structure
        const newPost = {
          ...response.data.post,
          content: {
            ...response.data.post.content,
            media: response.data.post.content?.media || mediaArray,
          },
        }
        dispatch(addPost(newPost))
      }

      // Emit real-time event based on content type
      if (socket && isConnected) {
        if (contentType === 'story') {
          socket.emit('story_created', {
            story: response.data.post,
            authorId: user?._id,
            authorName: user?.profile?.fullName,
          })
        } else {
          socket.emit('post_created', {
            post: response.data.post,
            authorId: user?._id,
            authorName: user?.profile?.fullName,
          })
        }
      }

      // Navigate to home to see the new post
      navigate('/')
      // Refresh feed to ensure consistency
      dispatch(fetchFeed())
    } catch (error: any) {
      console.error('Failed to create post:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      })
      
      let errorMessage = 'Failed to create post. Please try again.'
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 413) {
          errorMessage = 'File size too large. Please reduce the size of your media files.'
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid post data. Please check your input.'
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.'
        } else {
          errorMessage = error.response.data?.message || errorMessage
        }
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout. Your media files may be too large. Please try smaller files.'
        } else {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        }
      } else {
        // Error setting up request
        errorMessage = error.message || errorMessage
      }
      
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-plus-circle text-primary-light"></i>
            Create {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </h2>
          <button
            onClick={() => navigate('/')}
            className="text-text-gray hover:text-white transition-colors"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setContentType('post')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors ${
              contentType === 'post'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-gray'
            }`}
          >
            Post
          </button>
          <button
            onClick={() => setContentType('story')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors ${
              contentType === 'story'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-gray'
            }`}
          >
            Story
          </button>
          <button
            onClick={() => setContentType('reel')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors ${
              contentType === 'reel'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-gray'
            }`}
          >
            Reel
          </button>
          <button
            onClick={() => setContentType('live')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors relative ${
              contentType === 'live'
                ? 'bg-red-600 text-white'
                : 'bg-light-gray text-text-gray'
            }`}
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-video"></i>
              Live
              {contentType === 'live' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
              )}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Author Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              {user?.profile?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Create a post..."
                className="w-full bg-light-gray border-none rounded-xl px-4 py-2.5 text-white placeholder-text-gray outline-none text-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
            </div>
          </div>

          {/* Visibility Options */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-gray text-sm">Visibility:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setVisibility('following')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                  visibility === 'following'
                    ? 'bg-primary text-white'
                    : 'bg-light-gray text-text-gray hover:bg-light-gray/80'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                👥 Following
              </button>
              <button
                type="button"
                onClick={() => setVisibility('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                  visibility === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-light-gray text-text-gray hover:bg-light-gray/80'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                🌐 All
              </button>
              <button
                type="button"
                onClick={() => setVisibility('close_friends')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                  visibility === 'close_friends'
                    ? 'bg-primary text-white'
                    : 'bg-light-gray text-text-gray hover:bg-light-gray/80'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                ⭐ Close Friends
              </button>
              <button
                type="button"
                onClick={() => setVisibility('premium')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                  visibility === 'premium'
                    ? 'bg-primary text-white'
                    : 'bg-light-gray text-text-gray hover:bg-light-gray/80'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                👑 Premium
              </button>
              <button
                type="button"
                onClick={() => setVisibility('thick')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                  visibility === 'thick'
                    ? 'bg-primary text-white'
                    : 'bg-light-gray text-text-gray hover:bg-light-gray/80'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                💎 Thick
              </button>
            </div>
          </div>

          {/* Caption Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Caption ${contentType === 'story' ? '(Stories expire in 24 hours)' : contentType === 'live' ? '(Start your live stream)' : ''}`}
            className="w-full bg-light-gray border-none rounded-xl p-4 text-white placeholder-text-gray resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
            maxLength={contentType === 'story' ? 2200 : undefined}
          />
          
          {/* Live Stream Info */}
          {contentType === 'live' && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-semibold text-sm">Going Live</span>
              </div>
              <p className="text-xs text-text-gray">
                Your live stream will be visible to all your followers. Make sure you have a stable internet connection.
              </p>
            </div>
          )}

          {/* Media Upload */}
          {contentType !== 'live' && (
            <div>
              <label className="block text-sm font-medium mb-2">Media</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple={contentType !== 'story'}
                onChange={handleMediaUpload}
                className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white text-sm"
              />
              {mediaFiles.length > 0 && (
                <div className="mt-2 text-xs text-text-gray">
                  {mediaFiles.length} file(s) selected
                  {contentType === 'story' && ' (Max 30s)'}
                  {contentType === 'reel' && ' (Max 60s)'}
                  {contentType === 'post' && ' (Max 45s)'}
                </div>
              )}
            </div>
          )}
          
          {/* Live Stream Camera Access */}
          {contentType === 'live' && (
            <div>
              <label className="block text-sm font-medium mb-2">Camera & Microphone</label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.mediaDevices.getUserMedia({ 
                      video: true, 
                      audio: true 
                    })
                    alert('Camera and microphone access granted! Ready to go live.')
                    // TODO: Implement live streaming with WebRTC or similar
                  } catch (error) {
                    alert('Please allow camera and microphone access to go live.')
                    console.error('Media access error:', error)
                  }
                }}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-video"></i>
                Request Camera Access
              </button>
            </div>
          )}

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Hashtags ({hashtags.length}/15)
            </label>
            <input
              type="text"
              onKeyPress={handleHashtagInput}
              placeholder="Type hashtag and press Enter"
              className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((hashtag) => (
                  <span
                    key={hashtag}
                    className="bg-primary/20 text-primary-light px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {hashtag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(hashtag)}
                      className="hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* DSR Protection */}
          <div className="flex items-center justify-between p-3 bg-light-gray rounded-lg">
            <div>
              <h3 className="font-semibold text-sm">DSR Protection</h3>
              <p className="text-xs text-text-gray">Block screenshots and screen recording</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                checked={dsrProtected}
                onChange={(e) => setDsrProtected(e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                dsrProtected ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (!text.trim() && mediaFiles.length === 0)}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : `Create ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  )
}

