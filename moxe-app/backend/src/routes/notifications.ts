import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController'

const router = express.Router()

router.get('/', authenticate, getNotifications)
router.post('/:notificationId/read', authenticate, markAsRead)
router.post('/read-all', authenticate, markAllAsRead)
router.delete('/:notificationId', authenticate, deleteNotification)

export default router

