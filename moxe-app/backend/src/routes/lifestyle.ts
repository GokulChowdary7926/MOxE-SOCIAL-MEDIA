import express from 'express'
import { authenticate } from '../middleware/auth'
import { updateLifestyleStreak, getLifestyleStreaks, getActivityLeaderboard } from '../controllers/lifestyleController'

const router = express.Router()

router.post('/streak', authenticate, updateLifestyleStreak)
router.get('/streaks', authenticate, getLifestyleStreaks)
router.get('/leaderboard/:activity', authenticate, getActivityLeaderboard)

export default router


