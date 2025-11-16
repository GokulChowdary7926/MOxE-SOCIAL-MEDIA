import express from 'express'
import { authenticate } from '../middleware/auth'
import Collection from '../models/Collection'
import Post from '../models/Post'

const router = express.Router()

// Get all collections for current user
router.get('/', authenticate, async (req: any, res) => {
  try {
    const collections = await Collection.find({ owner: req.user._id }).sort({ updatedAt: -1 })
    res.json({ collections })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get a single collection with posts (paginated)
router.get('/:collectionId', authenticate, async (req: any, res) => {
  try {
    const { collectionId } = req.params
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const perPage = Math.min(50, Math.max(5, parseInt(req.query.perPage as string, 10) || 20))
    const coll = await Collection.findOne({ _id: collectionId, owner: req.user._id })
    if (!coll) return res.status(404).json({ message: 'Collection not found' })
    // reverse posts to show newest first (assuming push order); if you track createdAt, use sort instead
    const ids = (coll.posts || []).slice().reverse()
    const total = ids.length
    const start = (page - 1) * perPage
    const slice = ids.slice(start, start + perPage)
    const posts = await Post.find({ _id: { $in: slice } })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
    res.json({ collection: { _id: coll._id, name: coll.name, postCount: total }, posts, page, perPage, total })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create a collection
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { name, isPrivate } = req.body
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name required' })
    const collection = await Collection.create({
      owner: req.user._id,
      name: name.trim(),
      isPrivate: isPrivate !== false,
    })
    res.json({ collection })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add post to a collection
router.post('/:collectionId/add/:postId', authenticate, async (req: any, res) => {
  try {
    const { collectionId, postId } = req.params
    const coll = await Collection.findOne({ _id: collectionId, owner: req.user._id })
    if (!coll) return res.status(404).json({ message: 'Collection not found' })
    if (!coll.posts.some((id: any) => id.toString() === postId)) {
      coll.posts.push(postId as any)
      coll.postCount = (coll.postCount || 0) + 1
      await coll.save()
    }
    res.json({ collection: coll })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Remove post from a collection
router.delete('/:collectionId/remove/:postId', authenticate, async (req: any, res) => {
  try {
    const { collectionId, postId } = req.params
    const coll = await Collection.findOne({ _id: collectionId, owner: req.user._id })
    if (!coll) return res.status(404).json({ message: 'Collection not found' })
    const before = coll.posts.length
    coll.posts = coll.posts.filter((id: any) => id.toString() !== postId)
    if (coll.posts.length !== before) {
      coll.postCount = Math.max(0, (coll.postCount || 0) - 1)
      await coll.save()
    }
    res.json({ collection: coll })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete a collection
router.delete('/:collectionId', authenticate, async (req: any, res) => {
  try {
    const { collectionId } = req.params
    const coll = await Collection.findOne({ _id: collectionId, owner: req.user._id })
    if (!coll) return res.status(404).json({ message: 'Collection not found' })
    await Collection.deleteOne({ _id: collectionId })
    res.json({ message: 'Collection deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router


