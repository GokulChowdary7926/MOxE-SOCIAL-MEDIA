import express from 'express'
import { checkUsername, suggestUsernames } from '../controllers/usernameController'
import { rateLimiter } from '../middleware/rateLimiter'

const router = express.Router()

router.get('/check', rateLimiter(20, 30_000), checkUsername)
router.get('/suggest', suggestUsernames)

export default router


