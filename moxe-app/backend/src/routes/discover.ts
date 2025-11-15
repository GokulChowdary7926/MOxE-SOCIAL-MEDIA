import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getForYouFeed,
  getTrending,
  getPeopleRecommendations,
  getTrendingHashtags,
  search,
} from '../controllers/discoverController'

const router = express.Router()

router.get('/for-you', authenticate, getForYouFeed)
router.get('/trending', authenticate, getTrending)
router.get('/people', authenticate, getPeopleRecommendations)
router.get('/hashtags', authenticate, getTrendingHashtags)
router.get('/search', authenticate, search)

export default router

