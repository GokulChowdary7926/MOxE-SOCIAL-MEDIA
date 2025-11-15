import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  searchAll,
  searchUsers,
  searchPosts,
  searchHashtags,
} from '../controllers/searchController'

const router = express.Router()

router.get('/', authenticate, searchAll)
router.get('/users', authenticate, searchUsers)
router.get('/posts', authenticate, searchPosts)
router.get('/hashtags', authenticate, searchHashtags)

export default router


