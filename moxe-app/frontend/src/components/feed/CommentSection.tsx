import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Comment {
  _id: string
  author: {
    profile: {
      username: string
      fullName: string
      avatar?: string
    }
  }
  text: string
  likes: string[]
  createdAt: string
}

interface CommentSectionProps {
  postId: string
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      const response = await api.get(`/posts/${postId}/comments`)
      setComments(response.data.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsLoading(true)
    try {
      const response = await api.post(`/posts/${postId}/comment`, { text: newComment })
      setComments([response.data.comment, ...comments])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {comments.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
          {comments.map((comment) => (
            <div key={comment._id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {comment.author.profile.fullName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="bg-light-gray rounded-lg px-3 py-2">
                  <span className="font-semibold text-sm text-white">{comment.author.profile.fullName}</span>
                  <p className="text-sm text-white">{comment.text}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-gray">
                  <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                  <button className="hover:text-primary">Like ({comment.likes.length})</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-light-gray border-none rounded-full px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !newComment.trim()}
          className="text-primary font-semibold disabled:opacity-50 px-3"
        >
          Post
        </button>
      </form>
    </div>
  )
}

