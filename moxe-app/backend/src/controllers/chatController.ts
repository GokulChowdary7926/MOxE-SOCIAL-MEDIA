import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Message from '../models/Message'
import ChatRoom from '../models/ChatRoom'
import User from '../models/User'

// Existing chat functions (stubs - implement based on your existing logic)
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get all conversations for the user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { conversation: req.user._id },
          ],
        },
      },
      {
        $group: {
          _id: '$conversation',
          lastMessage: { $max: '$createdAt' },
        },
      },
      { $sort: { lastMessage: -1 } },
    ])

    res.json({ conversations })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { before, limit = '50' } = req.query as any
    const perPage = Math.min(Math.max(parseInt(String(limit), 10), 1), 100)
    const match: any = {
      $or: [
        { sender: req.user._id, conversation: userId },
        { sender: userId, conversation: req.user._id },
      ],
    }
    if (before) {
      match.createdAt = { $lt: new Date(String(before)) }
    }
    const messages = await Message.find(match)
      .populate('sender', 'profile')
      .sort({ createdAt: -1 })
      .limit(perPage)

    // return in chronological order to the client
    res.json({ messages: messages.reverse(), nextBefore: messages[0]?.createdAt || null })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, text, translation } = req.body

    if (!recipientId || !text) {
      return res.status(400).json({ message: 'Recipient ID and text required' })
    }

    const message = new Message({
      conversation: recipientId,
      sender: req.user._id,
      content: {
        type: 'text',
        text,
      },
      translation: translation ? {
        translatedText: translation,
        isTranslated: true,
      } : undefined,
    })

    await message.save()

    // Emit real-time event
    const io = req.app.get('io')
    if (io) {
      io.to(recipientId).emit('new_message', {
        conversationId: recipientId,
        message: await Message.findById(message._id).populate('sender', 'profile'),
      })
    }

    const savedMessage = await Message.findById(message._id).populate('sender', 'profile')
    res.json({
      message: 'Message sent successfully',
      data: savedMessage,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const translateMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId, targetLanguage } = req.body

    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    // In real implementation, use translation service
    message.translation = {
      originalText: message.content.text || '',
      translatedText: message.content.text || '', // Would be translated
      targetLanguage: targetLanguage || 'en',
      isTranslated: true,
    }

    await message.save()

    res.json({ message: 'Message translated successfully', translation: message.translation })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params
    const { text } = req.body

    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' })
    }

    message.content.text = text
    message.settings.isEdited = true
    message.settings.editedAt = new Date()
    await message.save()

    // Emit real-time event
    const io = req.app.get('io')
    if (io) {
      io.to(message.conversation.toString()).emit('message_edited', {
        messageId,
        message: await Message.findById(messageId).populate('sender', 'profile'),
      })
    }

    res.json({ message: 'Message edited successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const recallMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params

    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only recall your own messages' })
    }

    message.settings.isRecalled = true
    message.settings.recalledAt = new Date()
    await message.save()

    // Emit real-time event
    const io = req.app.get('io')
    if (io) {
      io.to(message.conversation.toString()).emit('message_recalled', {
        messageId,
      })
    }

    res.json({ message: 'Message recalled successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const createGroupChat = async (req: AuthRequest, res: Response) => {
  try {
    const { name, participants } = req.body

    if (!name || !participants || participants.length === 0) {
      return res.status(400).json({ message: 'Group name and at least one participant required' })
    }

    const chatRoom = new ChatRoom({
      name,
      type: 'group',
      participants: [req.user._id, ...participants],
      admins: [req.user._id],
      createdBy: req.user._id,
    })

    await chatRoom.save()

    res.json({
      message: 'Group chat created successfully',
      chatRoom: await ChatRoom.findById(chatRoom._id).populate('participants', 'profile'),
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getGroupChats = async (req: AuthRequest, res: Response) => {
  try {
    const chatRooms = await ChatRoom.find({
      participants: req.user._id,
      type: 'group',
      isActive: true,
    })
      .populate('participants', 'profile')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })

    res.json({ chatRooms })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const sendVoiceMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, audioUrl, duration } = req.body

    if (!conversationId || !audioUrl) {
      return res.status(400).json({ message: 'Conversation ID and audio URL required' })
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content: {
        type: 'voice',
        media: {
          url: audioUrl,
          duration: duration || 0,
        },
      },
    })

    await message.save()

    // Emit real-time event
    const io = req.app.get('io')
    if (io) {
      io.to(conversationId).emit('new_message', {
        conversationId,
        message: await Message.findById(message._id).populate('sender', 'profile'),
      })
    }

    const savedMessage = await Message.findById(message._id).populate('sender', 'profile')
    res.json({
      message: 'Voice message sent successfully',
      data: savedMessage,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const addMessageReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params
    const { emoji } = req.body

    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r: any) => r.user.toString() !== req.user._id.toString()
    )

    // Add new reaction
    if (emoji) {
      message.reactions.push({
        user: req.user._id,
        emoji,
        createdAt: new Date(),
      })
    }

    await message.save()

    // Emit real-time event
    const io = req.app.get('io')
    if (io) {
      io.to(message.conversation.toString()).emit('message_reaction_received', {
        messageId,
        reaction: { user: req.user._id, emoji },
      })
    }

    res.json({
      message: 'Reaction added successfully',
      reactions: message.reactions,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const markMessageAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params

    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (!message.status.readBy.includes(req.user._id as any)) {
      message.status.readBy.push(req.user._id as any)
      message.status.isRead = message.status.readBy.length > 0
      await message.save()

      // Emit real-time event
      const io = req.app.get('io')
      if (io) {
        io.to(message.conversation.toString()).emit('message_read_receipt', {
          messageId,
          readBy: req.user._id,
        })
      }
    }

    res.json({ message: 'Message marked as read' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

