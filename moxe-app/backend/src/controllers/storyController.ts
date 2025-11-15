import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Story from '../models/Story'
import User from '../models/User'

export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const { media, caption, visibility, oneTimeView, dsrProtected } = req.body

    if (!media || media.length === 0) {
      return res.status(400).json({ message: 'Media is required for stories' })
    }

    // Check user subscription for premium features
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Validate premium features
    if (oneTimeView && user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'One-time view feature requires a premium subscription (Star or Thick tier)' 
      })
    }

    // Handle visibility - can be string or object
    let visibilityType = 'public'
    let visibilityExcept: any[] = []
    
    if (typeof visibility === 'string') {
      visibilityType = visibility
    } else if (visibility && typeof visibility === 'object' && visibility.type) {
      visibilityType = visibility.type
      visibilityExcept = visibility.except || []
    }
    
    // Validate visibility type
    const validVisibilityTypes = ['public', 'followers', 'close_friends', 'private']
    if (!validVisibilityTypes.includes(visibilityType)) {
      visibilityType = 'public'
    }

    // Stories expire in 24 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const story = new Story({
      author: req.user._id,
      media: media.map((m: any) => ({
        url: m.url,
        type: m.type || 'image',
        thumbnail: m.thumbnail,
        duration: m.duration,
      })),
      caption: caption || '',
      oneTimeView: oneTimeView || false,
      dsrProtected: dsrProtected || false,
      visibility: {
        type: visibilityType,
        except: visibilityExcept,
      },
      expiresAt,
    })

    await story.save()
    await story.populate('author', 'profile subscription')

    // Emit Socket.io event for new story
    const io = req.app.get('io')
    if (io) {
      io.emit('new_story', { story })
    }

    res.json({ story })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getStoriesFeed = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get stories from users the current user follows
    const followingIds = [...user.following, user._id]
    
    const stories = await Story.find({
      author: { $in: followingIds },
      expiresAt: { $gt: new Date() }, // Only non-expired stories
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ stories })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const viewStory = async (req: AuthRequest, res: Response) => {
  try {
    const { storyId } = req.params
    const story = await Story.findById(storyId)

    if (!story) {
      return res.status(404).json({ message: 'Story not found' })
    }

    // Check if story is one-time view and already viewed
    if (story.oneTimeView && story.viewCount > 0) {
      // Check if current user has already viewed
      if (!story.views.includes(req.user._id)) {
        return res.status(403).json({ 
          message: 'This story can only be viewed once and has already been viewed' 
        })
      }
    }

    // Add user to views if not already viewed
    if (!story.views.includes(req.user._id)) {
      story.views.push(req.user._id)
      story.viewCount = (story.viewCount || 0) + 1
      await story.save()

      // Emit socket event for story view
      const io = req.app.get('io')
      if (io) {
        io.emit('story_viewed', {
          storyId: story._id,
          viewerId: req.user._id,
          viewCount: story.viewCount,
        })
      }
    }

    res.json({ story })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

