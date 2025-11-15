import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Comment from '../models/Comment'
import Post from '../models/Post'

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const { text, parentCommentId } = req.body

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const comment = new Comment({
      post: postId,
      author: req.user._id,
      text,
      parentComment: parentCommentId || undefined,
    })

    await comment.save()
    
    // Update post comment count
    if (Array.isArray(post.engagement.comments)) {
      (post.engagement.comments as any[]).push(comment._id)
    } else {
      // If comments is a number, increment it
      post.engagement.comments = ((post.engagement.comments as number) || 0) + 1
    }
    await post.save()

    await comment.populate('author', 'profile')

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io')
    if (io) {
      const User = require('../models/User').default
      const commenter = await User.findById(req.user._id)
      io.emit('new_comment', {
        postId,
        comment: comment.toObject(),
        commenterId: req.user._id,
        commenterName: commenter?.profile?.fullName,
        postAuthorId: (post.author as any)?._id,
        timestamp: new Date(),
      })
    }

    res.json({ comment })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params

    const comments = await Comment.find({ post: postId })
      .populate('author', 'profile')
      .populate('replies')
      .sort({ createdAt: -1 })

    res.json({ comments })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params
    const comment = await Comment.findById(commentId)

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    const userId = req.user._id
    const isLiked = comment.likes.includes(userId)

    if (isLiked) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString())
    } else {
      comment.likes.push(userId)
    }

    await comment.save()

    res.json({ comment })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

