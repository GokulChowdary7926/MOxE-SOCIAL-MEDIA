import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getTrendingTopics,
  getNearbyPlaces,
  discoverContent,
} from '../controllers/exploreController'

const router = express.Router()

router.get('/trending', authenticate, getTrendingTopics)
router.get('/nearby-places', authenticate, getNearbyPlaces)
router.get('/discover', authenticate, discoverContent)

export default router


