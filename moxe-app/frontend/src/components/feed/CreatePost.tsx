import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store'
import { fetchFeed, addPost } from '../../store/slices/postSlice'
import api from '../../services/api'
import { useSocket } from '../../hooks/useSocket'

export default function CreatePost() {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { socket, isConnected } = useSocket()
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isPosting) return

    setIsPosting(true)
    try {
      const response = await api.post('/posts', {
        text: text.trim(),
        visibility: 'public',
        contentType: 'post',
        media: [],
        hashtags: [],
        mentions: [],
      })

      // Immediately add post to feed for instant UI update
      if (response.data && response.data.post) {
        dispatch(addPost(response.data.post))
      }

      // Emit real-time event to notify followers
      if (socket && isConnected && response.data && response.data.post) {
        socket.emit('post_created', {
          post: response.data.post,
          authorId: user?._id,
          authorName: user?.profile?.fullName,
        })
      }

      setText('')
      setIsOpen(false)
      
      // Also refresh feed to ensure consistency
      dispatch(fetchFeed())
    } catch (error: any) {
      console.error('Failed to create post:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create post. Please try again.'
      alert(errorMessage)
    } finally {
      setIsPosting(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="bg-medium-gray rounded-2xl p-4 mb-4">
        <div
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
            {user?.profile?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 bg-light-gray rounded-full px-4 py-2 text-text-gray">
            Create a post...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-medium-gray rounded-2xl p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
            {user?.profile?.fullName?.charAt(0) || 'U'}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts with the community..."
            className="flex-1 bg-light-gray rounded-lg px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={4}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              className="text-text-gray hover:text-primary transition-colors"
              onClick={() => {
                setIsOpen(false)
                setText('')
              }}
            >
              Cancel
            </button>
          </div>
          <button
            type="submit"
            disabled={!text.trim() || isPosting}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPosting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
