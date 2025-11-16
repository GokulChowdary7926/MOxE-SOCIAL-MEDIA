import express from 'express'
import { authenticate } from '../middleware/auth'
import { getPlans, getStatus, subscribe, cancel } from '../controllers/subscriptionController'

const router = express.Router()

router.get('/plans', getPlans)
router.get('/status', authenticate, getStatus)
router.post('/subscribe', authenticate, subscribe)
router.post('/cancel', authenticate, cancel)

export default router


