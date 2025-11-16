import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getForYouFeed,
  getTrending,
  getPeopleRecommendations,
  getTrendingHashtags,
  search,
} from '../controllers/discoverController'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateQuery } from '../middleware/validate'

const router = express.Router()

router.get(
  '/for-you',
  authenticate,
  rateLimiter(60, 60_000),
  validateQuery({
    page: { regex: /^\d+$/ },
    limit: { regex: /^\d+$/ },
  }),
  getForYouFeed
)
router.get('/trending', authenticate, rateLimiter(60, 60_000), getTrending)
router.get('/people', authenticate, rateLimiter(60, 60_000), getPeopleRecommendations)
router.get('/hashtags', authenticate, rateLimiter(60, 60_000), getTrendingHashtags)
router.get(
  '/search',
  authenticate,
  rateLimiter(60, 60_000),
  validateQuery({ q: { required: true, minLength: 2, maxLength: 64 } }),
  search
)

export default router

