import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'

// Update lifestyle streak
export const updateLifestyleStreak = async (req: AuthRequest, res: Response) => {
  try {
    const { activity } = req.body // e.g., 'gym', 'gaming', 'movies'
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!activity) {
      return res.status(400).json({ message: 'Activity is required' })
    }

    // Initialize lifestyle streaks if not exists
    if (!user.lifestyleStreaks) {
      user.lifestyleStreaks = []
    }

    // Find existing streak for this activity
    let streak = user.lifestyleStreaks.find((s: any) => s.activity === activity)

    if (!streak) {
      // Create new streak
      streak = {
        activity,
        currentStreak: 1,
        longestStreak: 1,
        lastActivity: new Date(),
      }
      user.lifestyleStreaks.push(streak)
    } else {
      // Update existing streak
      const lastActivity = new Date(streak.lastActivity)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      lastActivity.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))

      if (daysDiff === 0) {
        // Already updated today
        return res.json({
          message: 'Activity already recorded today',
          streak: streak,
        })
      } else if (daysDiff === 1) {
        // Continue streak
        streak.currentStreak += 1
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
      } else {
        // Streak broken, reset
        streak.currentStreak = 1
      }

      streak.lastActivity = new Date()
    }

    // Check for badge achievements
    const badges = user.badges || []
    const newBadges: string[] = []

    if (streak.currentStreak === 7 && !badges.includes(`${activity}_week`)) {
      newBadges.push(`${activity}_week`)
      badges.push(`${activity}_week`)
    }
    if (streak.currentStreak === 30 && !badges.includes(`${activity}_month`)) {
      newBadges.push(`${activity}_month`)
      badges.push(`${activity}_month`)
    }
    if (streak.currentStreak === 100 && !badges.includes(`${activity}_century`)) {
      newBadges.push(`${activity}_century`)
      badges.push(`${activity}_century`)
    }

    user.badges = badges
    await user.save()

    // Emit Socket.io event for streak update
    const io = req.app.get('io')
    if (io) {
      io.emit('lifestyle_streak_updated', {
        userId: user._id,
        activity,
        streak: streak.currentStreak,
        newBadges,
        timestamp: new Date(),
      })
    }

    res.json({
      message: 'Lifestyle streak updated',
      streak,
      newBadges: newBadges.length > 0 ? newBadges : undefined,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Get lifestyle streaks
export const getLifestyleStreaks = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      streaks: user.lifestyleStreaks || [],
      badges: user.badges || [],
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Get leaderboard for an activity
export const getActivityLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { activity } = req.params

    // Get top users by current streak for this activity
    const users = await User.find({
      'lifestyleStreaks.activity': activity,
    }).select('profile lifestyleStreaks badges')

    const leaderboard = users
      .map((user: any) => {
        const streak = user.lifestyleStreaks.find((s: any) => s.activity === activity)
        return {
          userId: user._id,
          username: user.profile?.username,
          fullName: user.profile?.fullName,
          avatar: user.profile?.avatar,
          currentStreak: streak?.currentStreak || 0,
          longestStreak: streak?.longestStreak || 0,
        }
      })
      .filter((entry: any) => entry.currentStreak > 0)
      .sort((a: any, b: any) => b.currentStreak - a.currentStreak)
      .slice(0, 100) // Top 100

    res.json({
      activity,
      leaderboard,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


