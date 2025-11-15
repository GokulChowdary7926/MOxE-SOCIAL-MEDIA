import express from 'express'
import { authenticate } from '../middleware/auth'
import { createStory, getStoriesFeed, viewStory } from '../controllers/storyController'

const router = express.Router()

router.post('/', authenticate, createStory)
router.get('/feed', authenticate, getStoriesFeed)
router.post('/:storyId/view', authenticate, viewStory)

export default router

