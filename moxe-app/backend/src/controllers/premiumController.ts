import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import Message from '../models/Message'

// Helper to check subscription period
const isPeriodValid = (periodStart?: Date, periodEnd?: Date) => {
  if (!periodStart || !periodEnd) return false
  return new Date() <= periodEnd
}

// Helper to reset period
const resetPeriod = (user: any) => {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
  user.subscription.periodStart = now
  user.subscription.periodEnd = periodEnd
  user.subscription.blockedUsersMessaged = []
}

// Message blocked user (Premium feature)
export const messageBlockedUser = async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, text } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user has premium subscription
    if (user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'This feature requires a premium subscription (Star or Thick tier)' 
      })
    }

    // Check if period is valid, reset if needed
    if (!isPeriodValid(user.subscription.periodStart, user.subscription.periodEnd)) {
      resetPeriod(user)
      await user.save()
    }

    // Check if recipient is blocked
    const recipient = await User.findById(recipientId)
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }

    const isBlocked = recipient.blockedUsers.some(
      (id: any) => id.toString() === (user._id as any).toString()
    )

    if (!isBlocked) {
      return res.status(400).json({ message: 'This user has not blocked you' })
    }

    // Check if user has already messaged 2 blocked users this period
    const blockedUsersMessaged = user.subscription.blockedUsersMessaged || []
    if (blockedUsersMessaged.length >= 2) {
      return res.status(403).json({ 
        message: 'You have reached the limit of 2 blocked users per subscription period (28 days)' 
      })
    }

    // Check if this specific user is already in the list
    const existingEntry = blockedUsersMessaged.find(
      (entry: any) => entry.userId.toString() === recipientId
    )

    if (existingEntry) {
      // Check if 14 days have passed since period start
      const daysSincePeriodStart = Math.floor(
        (Date.now() - new Date(user.subscription.periodStart!).getTime()) / (24 * 60 * 60 * 1000)
      )

      if (daysSincePeriodStart >= 14) {
        return res.status(403).json({ 
          message: 'You can only message blocked users for 14 days within each 28-day period' 
        })
      }

      // Check daily character limit (150 chars/day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Count messages sent today to this user
      const messagesToday = await Message.countDocuments({
        sender: user._id,
        'settings.isBlockedMessage': true,
        createdAt: { $gte: today },
      })

      if (messagesToday > 0) {
        // Check character limit
        const messagesTodayData = await Message.find({
          sender: user._id,
          'settings.isBlockedMessage': true,
          createdAt: { $gte: today },
        })

        const totalChars = messagesTodayData.reduce(
          (sum, msg) => sum + (msg.content.text?.length || 0), 
          0
        )

        if (totalChars + text.length > 150) {
          return res.status(403).json({ 
            message: 'Daily character limit reached (150 characters per day per blocked user). Upgrade for more characters.' 
          })
        }
      }
    } else {
      // Add new entry
      const periodStart = user.subscription.periodStart || new Date()
      const periodEnd = user.subscription.periodEnd || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
      blockedUsersMessaged.push({
        userId: recipientId,
        messagesSent: 0,
        periodStart,
        periodEnd,
      })
    }

    // Validate message length
    if (text.length > 150) {
      return res.status(400).json({ 
        message: 'Message exceeds 150 character limit for blocked users' 
      })
    }

    // Create message with blocked flag
    const message = new Message({
      conversation: recipientId, // Using recipient ID as conversation ID
      sender: user._id,
      content: {
        type: 'text',
        text,
      },
      settings: {
        isBlockedMessage: true,
      },
    })

    await message.save()
    await message.populate('sender', 'profile')

    // Update user subscription tracking
    if (existingEntry) {
      existingEntry.messagesSent = (existingEntry.messagesSent || 0) + 1
    } else {
      const entry = blockedUsersMessaged[blockedUsersMessaged.length - 1]
      entry.messagesSent = 1
    }

    user.subscription.blockedUsersMessaged = blockedUsersMessaged
    await user.save()

    // Emit Socket.io event
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${recipientId}`).emit('blocked_user_message', {
        message,
        senderId: user._id,
        senderName: user.profile?.fullName,
        isBlockedMessage: true,
        timestamp: new Date(),
      })
    }

    res.json({
      message: 'Message sent to blocked user',
      messageData: message,
      remainingChars: 150 - text.length,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// View profile anonymously (Premium feature)
export const viewProfileAnonymously = async (req: AuthRequest, res: Response) => {
  try {
    const { profileUserId } = req.params
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user has premium subscription
    if (user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'This feature requires a premium subscription' 
      })
    }

    // Check daily limit (2 profiles per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const anonymousProfilesViewed = user.subscription.anonymousProfilesViewed || []
    const viewsToday = anonymousProfilesViewed.filter(
      (entry: any) => new Date(entry.date) >= today
    ).length

    if (viewsToday >= 2) {
      return res.status(403).json({ 
        message: 'Daily limit reached. You can view 2 profiles anonymously per day.' 
      })
    }

    // Get profile
    const profileUser = await User.findById(profileUserId)
    if (!profileUser) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    // Track anonymous view
    anonymousProfilesViewed.push({
      userId: profileUserId as any,
      date: new Date(),
    })

    user.subscription.anonymousProfilesViewed = anonymousProfilesViewed
    await user.save()

    // Return profile data (without tracking visit if anonymous)
    res.json({
      profile: {
        _id: profileUser._id,
        profile: profileUser.profile,
        accountType: profileUser.accountType,
        subscription: {
          tier: profileUser.subscription.tier,
        },
        followers: profileUser.followers.length,
        following: profileUser.following.length,
        isAnonymous: true,
      },
      remainingViews: 2 - viewsToday - 1,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// View story anonymously (Premium feature)
export const viewStoryAnonymously = async (req: AuthRequest, res: Response) => {
  try {
    const { storyId } = req.params
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user has premium subscription
    if (user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'This feature requires a premium subscription' 
      })
    }

    // Check daily limit (2 stories per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const anonymousStoriesViewed = user.subscription.anonymousStoriesViewed || []
    const viewsToday = anonymousStoriesViewed.filter(
      (entry: any) => new Date(entry.date) >= today
    ).length

    if (viewsToday >= 2) {
      return res.status(403).json({ 
        message: 'Daily limit reached. You can view 2 stories anonymously per day.' 
      })
    }

    // Get story
    const Story = require('../models/Story').default
    const story = await Story.findById(storyId).populate('author', 'profile')
    if (!story) {
      return res.status(404).json({ message: 'Story not found' })
    }

    // Track anonymous view (don't add to story.views)
    anonymousStoriesViewed.push({
      userId: story.author._id,
      date: new Date(),
    })

    user.subscription.anonymousStoriesViewed = anonymousStoriesViewed
    await user.save()

    res.json({
      story,
      isAnonymous: true,
      remainingViews: 2 - viewsToday - 1,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

