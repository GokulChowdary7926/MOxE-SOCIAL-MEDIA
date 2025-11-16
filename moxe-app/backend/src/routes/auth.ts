import express from 'express'
import { authenticate } from '../middleware/auth'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateBody } from '../middleware/validate'
import { requestOTP, verifyOTP, register, login, getMe, logout } from '../controllers/authController'

const router = express.Router()

router.post(
  '/request-otp',
  rateLimiter(10, 60_000),
  validateBody({
    phone: { required: true, regex: /^[+]?[\d]{10,15}$/, message: 'Invalid phone format' },
  }),
  requestOTP
)
router.post(
  '/verify-otp',
  rateLimiter(20, 60_000),
  validateBody({
    phone: { required: true, regex: /^[+]?[\d]{10,15}$/ },
    otp: { required: true, regex: /^\d{6}$/, message: 'OTP must be 6 digits' },
  }),
  verifyOTP
)
router.post(
  '/register',
  rateLimiter(10, 60_000),
  validateBody({
    phone: { required: true, regex: /^[+]?[\d]{10,15}$/ },
    otp: { required: true, regex: /^\d{6}$/ },
    name: { required: true, minLength: 1, maxLength: 100 },
    accountType: { required: true, enum: ['personal', 'business', 'creator'] },
  }),
  register
)
router.post(
  '/login',
  rateLimiter(20, 60_000),
  validateBody({
    phone: { required: true, regex: /^[+]?[\d]{10,15}$/ },
  }),
  login
)
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)

export default router



