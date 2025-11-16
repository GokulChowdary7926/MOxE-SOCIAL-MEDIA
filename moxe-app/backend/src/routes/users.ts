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
  getCloseFriends,
  addCloseFriend,
  removeCloseFriend,
} from '../controllers/userController'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateBody } from '../middleware/validate'
import { changeUsername, saveDeviceToken, removeDeviceToken } from '../controllers/userController'
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
router.get('/close-friends', authenticate, getCloseFriends)
router.post('/close-friends', authenticate, addCloseFriend)
router.delete('/close-friends/:userId', authenticate, removeCloseFriend)
router.put('/subscription', authenticate, updateSub)
router.get('/subscription/status', authenticate, getSubscriptionStatus)
router.post('/trusted-contacts', authenticate, addTrustedContact)
router.delete('/trusted-contacts/:contactId', authenticate, removeTrustedContact)
router.get('/trusted-contacts', authenticate, getTrustedContacts)

// Username change with cooldown
router.patch(
  '/username',
  authenticate,
  rateLimiter(5, 60_000),
  validateBody({ username: { required: true, regex: /^(?=.{3,30}$)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]+$/ } }),
  changeUsername
)

// Device tokens for push notifications
router.post('/device-token', authenticate, rateLimiter(30, 60_000), validateBody({ token: { required: true } }), saveDeviceToken)
router.delete('/device-token', authenticate, rateLimiter(30, 60_000), validateBody({ token: { required: true } }), removeDeviceToken)

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



