import express from 'express'
import { authenticate } from '../middleware/auth'
import { requestOTP, verifyOTP, register, login, getMe, logout } from '../controllers/authController'

const router = express.Router()

router.post('/request-otp', requestOTP)
router.post('/verify-otp', verifyOTP)
router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)

export default router



