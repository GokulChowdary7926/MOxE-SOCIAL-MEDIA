import express from 'express'
import { authenticate } from '../middleware/auth'
import { createStory, getStoriesFeed, viewStory, sharePostToStory } from '../controllers/storyController'

const router = express.Router()

router.post('/', authenticate, createStory)
router.get('/feed', authenticate, getStoriesFeed)
router.post('/:storyId/view', authenticate, viewStory)
router.post('/share/:postId', authenticate, sharePostToStory)

export default router

