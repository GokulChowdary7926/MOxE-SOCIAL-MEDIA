import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getConversations, 
  getMessages, 
  sendMessage, 
  translateMessage,
  editMessage,
  recallMessage,
  createGroupChat,
  getGroupChats,
  sendVoiceMessage,
  addMessageReaction,
  markMessageAsRead,
} from '../controllers/chatController'

const router = express.Router()

// Direct messages
router.get('/conversations', authenticate, getConversations)
router.get('/messages/:userId', authenticate, getMessages)
router.post('/send', authenticate, sendMessage)
router.put('/message/:messageId/edit', authenticate, editMessage)
router.delete('/message/:messageId/recall', authenticate, recallMessage)
router.post('/translate', authenticate, translateMessage)

// Group chats
router.post('/groups', authenticate, createGroupChat)
router.get('/groups', authenticate, getGroupChats)

// Enhanced messaging
router.post('/voice', authenticate, sendVoiceMessage)
router.post('/message/:messageId/reaction', authenticate, addMessageReaction)
router.post('/message/:messageId/read', authenticate, markMessageAsRead)

export default router
