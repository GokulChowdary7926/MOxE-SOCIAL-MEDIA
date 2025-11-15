import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import api from '../services/api'
import VoiceCommand from '../components/map/VoiceCommand'

interface NearbyMessage {
  _id: string
  content: {
    text?: string
    media?: Array<{
      url: string
      type: 'image' | 'video'
    }>
  }
  sender: {
    _id: string
    profile: {
      fullName: string
      username?: string
      avatar?: string
    }
  }
  nearby?: {
    radius: number
    distance?: number
  }
  createdAt: string
  visibility?: string
}

export default function NearbyMessaging() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [nearbyRadius, setNearbyRadius] = useState(1000)
  const [anonymousMode, setAnonymousMode] = useState(false)
  const [messages, setMessages] = useState<NearbyMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [visibility, setVisibility] = useState('public')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  useEffect(() => {
    loadSettings()
    loadNearbyMessages()
    // Refresh messages every 10 seconds
    const interval = setInterval(loadNearbyMessages, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings')
      const settings = response.data
      setNearbyRadius(settings.nearbyMessaging?.radius || 1000)
      setAnonymousMode(settings.nearbyMessaging?.anonymousMode || false)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSettings = async (updates: any) => {
    try {
      await api.put('/settings', updates)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const loadNearbyMessages = async () => {
    try {
      setIsLoadingMessages(true)
      const response = await api.get('/location/nearby-messages', {
        params: { radius: nearbyRadius }
      })
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Failed to load nearby messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !mediaFile) return

    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('message', newMessage.trim())
      formData.append('radius', nearbyRadius.toString())
      formData.append('anonymous', anonymousMode.toString())
      formData.append('visibility', visibility)
      if (mediaFile) {
        formData.append('media', mediaFile)
      }

      const response = await api.post('/location/nearby-message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      alert(`Message sent to ${response.data.recipients || 0} nearby users!`)
      setNewMessage('')
      setMediaFile(null)
      setMediaPreview(null)
      loadNearbyMessages()
    } catch (error: any) {
      console.error('Failed to send nearby message:', error)
      alert(error.response?.data?.message || 'Failed to send nearby message')
    } finally {
      setIsSending(false)
    }
  }

  const handleVoiceMessage = async (message: string) => {
    setNewMessage(message)
    // Auto-send voice messages
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return ''
    if (distance < 1000) return `${Math.round(distance)}m`
    return `${(distance / 1000).toFixed(1)}km`
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-broadcast-tower text-primary-light"></i>
            Nearby Messaging
          </h3>
          <button
            onClick={() => navigate('/map')}
            className="text-text-gray hover:text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <p className="text-sm text-text-gray mb-4">
          Connect with people in your immediate area (up to 5km radius).
        </p>
        
        {/* Radius Selection */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Set Radius:</label>
          <select 
            className="w-full bg-light-gray border-none rounded-lg p-2 text-white"
            value={nearbyRadius}
            onChange={(e) => {
              const newRadius = Number(e.target.value)
              setNearbyRadius(newRadius)
              saveSettings({ nearbyMessaging: { radius: newRadius, anonymousMode } })
              loadNearbyMessages()
            }}
          >
            <option value="500">500m</option>
            <option value="1000">1km</option>
            <option value="2000">2km</option>
            <option value="5000">5km</option>
          </select>
        </div>

        {/* Anonymous Mode */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm">Anonymous Mode</span>
          <label className="relative inline-block w-12 h-6">
            <input 
              type="checkbox" 
              className="opacity-0 w-0 h-0" 
              checked={anonymousMode}
              onChange={(e) => {
                const newValue = e.target.checked
                setAnonymousMode(newValue)
                saveSettings({ nearbyMessaging: { radius: nearbyRadius, anonymousMode: newValue } })
              }}
            />
            <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
              anonymousMode ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
            }`}></span>
          </label>
        </div>
      </div>

      {/* Send Message Section */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
          <i className="fas fa-comment-dots text-primary-light"></i>
          What's on your mind?
        </h4>
        <p className="text-sm text-text-gray mb-4">
          Share with people in your immediate area
        </p>

        {/* Visibility Selection */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Post Visibility:</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full bg-light-gray border-none rounded-lg p-2 text-white"
          >
            <option value="public">🌐 Public</option>
            <option value="followers">👥 Followers</option>
            <option value="close_friends">⭐ Close Friends</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>

        {/* Message Input */}
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="What's on your mind? Share with nearby users..."
          className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white placeholder-text-gray resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-4"
          rows={3}
        />

        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative mb-4">
            {mediaFile?.type.startsWith('image/') ? (
              <img 
                src={mediaPreview} 
                alt="Preview" 
                className="w-full max-h-48 object-cover rounded-lg"
              />
            ) : mediaFile?.type.startsWith('video/') ? (
              <video 
                src={mediaPreview} 
                controls 
                className="w-full max-h-48 rounded-lg"
              />
            ) : null}
            <button
              onClick={() => {
                setMediaFile(null)
                setMediaPreview(null)
              }}
              className="absolute top-2 right-2 bg-danger text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Voice Command */}
        <div className="mb-4">
          <VoiceCommand onMessage={handleVoiceMessage} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <label className="cursor-pointer bg-light-gray hover:bg-dark-gray rounded-lg p-2 transition-colors">
            <i className="fas fa-image text-primary-light"></i>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !mediaFile) || isSending}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Send
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nearby Messages List */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold flex items-center gap-2">
            <i className="fas fa-comments text-primary-light"></i>
            Nearby Messages
          </h4>
          <button
            onClick={loadNearbyMessages}
            disabled={isLoadingMessages}
            className="text-primary-light hover:text-primary transition-colors"
          >
            <i className={`fas fa-sync-alt ${isLoadingMessages ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        {isLoadingMessages && messages.length === 0 ? (
          <div className="text-center py-8 text-text-gray">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading nearby messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-text-gray">
            <i className="fas fa-comments text-4xl mb-4"></i>
            <p>No nearby messages yet</p>
            <p className="text-sm mt-1">Send a message to start chatting with people near you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message._id}
                className="bg-dark-gray rounded-lg p-3 hover:bg-light-gray transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                    {message.sender?.profile?.avatar ? (
                      <img 
                        src={message.sender.profile.avatar} 
                        alt={message.sender.profile.fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span>{message.sender?.profile?.fullName?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {anonymousMode && message.sender._id !== user?._id 
                            ? 'Anonymous User' 
                            : message.sender?.profile?.fullName || 'Unknown User'}
                        </span>
                        {message.visibility && (
                          <span className="text-xs bg-primary/20 text-primary-light px-2 py-0.5 rounded-full">
                            {message.visibility}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-gray">
                        {formatDistance(message.nearby?.distance)}
                      </span>
                    </div>
                    
                    {message.content?.text && (
                      <p className="text-sm mb-2">{message.content.text}</p>
                    )}

                    {message.content?.media && message.content.media.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {message.content.media.map((media, idx) => (
                          <div key={idx}>
                            {media.type === 'image' ? (
                              <img 
                                src={media.url} 
                                alt="Message media"
                                className="w-full max-h-48 object-cover rounded-lg"
                              />
                            ) : media.type === 'video' ? (
                              <video 
                                src={media.url} 
                                controls
                                className="w-full max-h-48 rounded-lg"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-text-gray">
                      <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                      {message.nearby?.radius && (
                        <>
                          <span>•</span>
                          <span>Within {formatDistance(message.nearby.radius)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

