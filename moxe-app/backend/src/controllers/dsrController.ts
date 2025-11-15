import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Post from '../models/Post'
import Story from '../models/Story'

// Log DSR violation attempts
const violationLog: Map<string, Array<{ timestamp: Date; userId: string; contentId: string }>> = new Map()

// Record DSR violation attempt
export const recordDSRViolation = async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, contentType } = req.body // contentType: 'post' | 'story' | 'reel'
    const userId = req.user._id.toString()

    // Get content
    let content
    if (contentType === 'story') {
      content = await Story.findById(contentId)
    } else {
      content = await Post.findById(contentId)
    }

    if (!content) {
      return res.status(404).json({ message: 'Content not found' })
    }

    // Check if content is DSR protected
    const isProtected = contentType === 'story' 
      ? (content as any).dsrProtected 
      : (content as any).content?.dsrProtected

    if (!isProtected) {
      return res.json({ message: 'Content is not DSR protected' })
    }

    // Log violation
    const userViolations = violationLog.get(userId) || []
    userViolations.push({
      timestamp: new Date(),
      userId,
      contentId,
    })
    violationLog.set(userId, userViolations)

    // Check violation count
    const violationsToday = userViolations.filter(
      v => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return v.timestamp >= today
      }
    ).length

    // First attempt: Warning
    if (violationsToday === 1) {
      return res.json({
        warning: true,
        message: 'Screenshot/recording not allowed on protected content. This is your first warning.',
      })
    }

    // Multiple attempts: Temporary restriction
    if (violationsToday >= 3) {
      return res.status(403).json({
        message: 'Multiple DSR violations detected. You are temporarily restricted from viewing protected content.',
        restricted: true,
      })
    }

    res.json({
      warning: true,
      message: `Screenshot/recording not allowed. Warning ${violationsToday} of 3.`,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Enable/disable DSR protection for content
export const toggleDSRProtection = async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, contentType, enabled } = req.body
    const userId = req.user._id

    let content
    if (contentType === 'story') {
      content = await Story.findById(contentId)
    } else {
      content = await Post.findById(contentId)
    }

    if (!content) {
      return res.status(404).json({ message: 'Content not found' })
    }

    // Verify ownership
    if (content.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only modify your own content' })
    }

    // Update DSR protection
    if (contentType === 'story') {
      (content as any).dsrProtected = enabled
    } else {
      (content as any).content.dsrProtected = enabled
    }

    await content.save()

    res.json({
      message: `DSR protection ${enabled ? 'enabled' : 'disabled'}`,
      dsrProtected: enabled,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Get DSR violation logs (for content owner)
export const getDSRViolations = async (req: AuthRequest, res: Response) => {
  try {
    const { contentId } = req.params
    const userId = req.user._id

    // Get content to verify ownership
    const content = await Post.findById(contentId) || await Story.findById(contentId)
    if (!content) {
      return res.status(404).json({ message: 'Content not found' })
    }

    if (content.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only view violations for your own content' })
    }

    // Get violations for this content
    const allViolations: Array<{ userId: string; timestamp: Date; contentId: string }> = []
    violationLog.forEach((violations) => {
      violations.forEach(v => {
        if (v.contentId === contentId) {
          allViolations.push(v)
        }
      })
    })

    res.json({
      violations: allViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      total: allViolations.length,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


