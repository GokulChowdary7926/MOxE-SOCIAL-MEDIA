import express from 'express'
import { authenticate } from '../middleware/auth'
import { getFeed, createPost, likePost, dislikePost, sharePost, savePost, getUserPosts, deletePost, archivePost, hidePost, reportPost, pinPost, hideFromProfile, toggleComments, getUserReels, getSavedPosts, getTaggedPosts, getPost, updatePost } from '../controllers/postController'
import { addComment, getComments, likeComment } from '../controllers/commentController'

const router = express.Router()

router.get('/feed', authenticate, getFeed)
router.get('/user/:userId', authenticate, getUserPosts)
router.get('/user-posts', authenticate, (req, res, next) => {
  // Redirect to user endpoint with current user ID
  req.params.userId = req.user._id.toString()
  return getUserPosts(req as any, res, next)
})
router.get('/reels', authenticate, (req, res, next) => {
  const userId = req.query.userId as string || req.user._id.toString()
  req.params.userId = userId
  return getUserReels(req as any, res, next)
})
router.get('/saved', authenticate, getSavedPosts)
router.get('/tagged', authenticate, (req, res, next) => {
  const userId = req.query.userId as string || req.user._id.toString()
  req.params.userId = userId
  return getTaggedPosts(req as any, res, next)
})
router.post('/', authenticate, createPost)
router.put('/:postId', authenticate, updatePost)
router.post('/:postId/like', authenticate, likePost)
router.post('/:postId/dislike', authenticate, dislikePost)
router.post('/:postId/share', authenticate, sharePost)
router.post('/:postId/save', authenticate, savePost)
router.post('/:postId/comment', authenticate, addComment)
router.get('/:postId/comments', authenticate, getComments)
router.get('/:id', authenticate, getPost)
router.delete('/:postId', authenticate, deletePost)
router.post('/:postId/archive', authenticate, archivePost)
router.post('/:postId/hide', authenticate, hidePost)
router.post('/:postId/report', authenticate, reportPost)
router.post('/:postId/pin', authenticate, pinPost)
router.post('/:postId/hide-from-profile', authenticate, hideFromProfile)
router.post('/:postId/toggle-comments', authenticate, toggleComments)

export default router


