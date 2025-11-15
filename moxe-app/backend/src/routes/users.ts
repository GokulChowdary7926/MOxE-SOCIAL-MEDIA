import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  updateSubscription,
  addTrustedContact,
  removeTrustedContact,
  getTrustedContacts,
  getSuggestions,
} from '../controllers/userController'
import { updateSubscription as updateSub, getSubscriptionStatus } from '../controllers/subscriptionController'
import { messageBlockedUser, viewProfileAnonymously, viewStoryAnonymously } from '../controllers/premiumController'
import {
  getUserSettings,
  updateUserSettings,
  updatePassword,
  deactivateAccount,
  getBlockedUsers,
  unblockUser,
  getSessions,
  revokeSession,
  revokeAllSessions,
  getLoginActivity,
  requestDataExport,
  downloadDataExport,
  getConnectedApps,
  disconnectApp,
} from '../controllers/userSettingsController'

const router = express.Router()

router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.post('/follow/:userId', authenticate, followUser)
router.post('/unfollow/:userId', authenticate, unfollowUser)
router.get('/followers', authenticate, getFollowers)
router.get('/suggestions', authenticate, getSuggestions)
router.put('/subscription', authenticate, updateSub)
router.get('/subscription/status', authenticate, getSubscriptionStatus)
router.post('/trusted-contacts', authenticate, addTrustedContact)
router.delete('/trusted-contacts/:contactId', authenticate, removeTrustedContact)
router.get('/trusted-contacts', authenticate, getTrustedContacts)

// Settings endpoints
router.get('/settings', authenticate, getUserSettings)
router.patch('/settings', authenticate, updateUserSettings)
router.patch('/settings/password', authenticate, updatePassword)
router.post('/deactivate', authenticate, deactivateAccount)
router.get('/blocked', authenticate, getBlockedUsers)
router.post('/unblock/:userId', authenticate, unblockUser)
router.get('/sessions', authenticate, getSessions)
router.delete('/sessions/:sessionId', authenticate, revokeSession)
router.delete('/sessions/all', authenticate, revokeAllSessions)
router.get('/login-activity', authenticate, getLoginActivity)
router.post('/data-export/request', authenticate, requestDataExport)
router.get('/data-export/download', authenticate, downloadDataExport)
router.get('/connected-apps', authenticate, getConnectedApps)
router.delete('/connected-apps/:appId', authenticate, disconnectApp)

// Premium features
router.post('/premium/message-blocked', authenticate, messageBlockedUser)
router.get('/premium/profile/:profileUserId/anonymous', authenticate, viewProfileAnonymously)
router.get('/premium/story/:storyId/anonymous', authenticate, viewStoryAnonymously)

export default router


