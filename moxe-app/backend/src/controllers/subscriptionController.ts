import { Request, Response } from 'express'
import User from '../models/User'

export const getPlans = async (_req: Request, res: Response) => {
  res.json({
    plans: [
      { id: 'basic', name: 'Basic', priceMonthly: 0, features: ['Ads supported'] },
      { id: 'star', name: 'Star', priceMonthly: 1, features: ['Ad-free', 'Story analytics', 'Extended stories'] },
      { id: 'thick', name: 'Thick', priceMonthly: 5, features: ['Business insights', 'Shop tagging', 'Priority support'] },
    ],
  })
}

export const getStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId).select('subscription')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ subscription: user.subscription })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

export const subscribe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id
    const { plan } = req.body
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!['star', 'thick'].includes(plan)) return res.status(400).json({ message: 'Invalid plan' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.subscription.tier = plan
    user.subscription.startDate = new Date()
    user.subscription.endDate = undefined
    user.subscription.autoRenew = true
    await user.save()
    res.json({ message: 'Subscribed', subscription: user.subscription })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

export const cancel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.subscription.autoRenew = false
    user.subscription.endDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
    await user.save()
    res.json({ message: 'Subscription will end at period end', subscription: user.subscription })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'

// Helper to calculate subscription period (28 days)
const calculatePeriod = () => {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000) // 28 days
  return { periodStart: now, periodEnd }
}

// Helper to check if subscription period is valid
const isPeriodValid = (periodStart?: Date, periodEnd?: Date) => {
  if (!periodStart || !periodEnd) return false
  return new Date() <= periodEnd
}

// Helper to reset period
const resetPeriod = (user: any) => {
  const { periodStart, periodEnd } = calculatePeriod()
  user.subscription.periodStart = periodStart
  user.subscription.periodEnd = periodEnd
  
  // Reset premium feature counters
  if (!user.subscription.blockedUsersMessaged) {
    user.subscription.blockedUsersMessaged = []
  }
  if (!user.subscription.anonymousProfilesViewed) {
    user.subscription.anonymousProfilesViewed = []
  }
  if (!user.subscription.anonymousStoriesViewed) {
    user.subscription.anonymousStoriesViewed = []
  }
  
  // Clean up old entries
  user.subscription.blockedUsersMessaged = user.subscription.blockedUsersMessaged.filter(
    (entry: any) => entry.periodEnd > new Date()
  )
  
  // Clean up old anonymous views (keep only last 2 days)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  user.subscription.anonymousProfilesViewed = user.subscription.anonymousProfilesViewed.filter(
    (entry: any) => entry.date > twoDaysAgo
  )
  user.subscription.anonymousStoriesViewed = user.subscription.anonymousStoriesViewed.filter(
    (entry: any) => entry.date > twoDaysAgo
  )
}

export const updateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Validate tier
    if (!['basic', 'star', 'thick'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid subscription tier' })
    }

    // Validate tier for account type
    if (tier === 'star' && user.accountType !== 'personal') {
      return res.status(400).json({ message: 'Star tier is only available for personal accounts' })
    }

    if (tier === 'thick' && !['business', 'creator'].includes(user.accountType)) {
      return res.status(400).json({ message: 'Thick tier is only available for business and creator accounts' })
    }

    // Update subscription
    const now = new Date()
    const isNewSubscription = user.subscription.tier === 'basic' && tier !== 'basic'
    
    user.subscription.tier = tier
    user.subscription.startDate = isNewSubscription ? now : user.subscription.startDate
    user.subscription.endDate = tier !== 'basic' 
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : undefined

    // Reset period if needed
    if (!isPeriodValid(user.subscription.periodStart, user.subscription.periodEnd)) {
      resetPeriod(user)
    }

    await user.save()

    res.json({
      message: 'Subscription updated successfully',
      subscription: user.subscription,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if period needs reset
    if (!isPeriodValid(user.subscription.periodStart, user.subscription.periodEnd)) {
      resetPeriod(user)
      await user.save()
    }

    // Calculate premium feature usage
    const blockedUsersCount = user.subscription.blockedUsersMessaged?.length || 0
    const anonymousProfilesToday = user.subscription.anonymousProfilesViewed?.filter(
      (entry: any) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return new Date(entry.date) >= today
      }
    ).length || 0
    const anonymousStoriesToday = user.subscription.anonymousStoriesViewed?.filter(
      (entry: any) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return new Date(entry.date) >= today
      }
    ).length || 0

    res.json({
      subscription: user.subscription,
      usage: {
        blockedUsersMessaged: blockedUsersCount,
        maxBlockedUsers: user.subscription.tier !== 'basic' ? 2 : 0,
        anonymousProfilesViewed: anonymousProfilesToday,
        maxAnonymousProfiles: user.subscription.tier !== 'basic' ? 2 : 0,
        anonymousStoriesViewed: anonymousStoriesToday,
        maxAnonymousStories: user.subscription.tier !== 'basic' ? 2 : 0,
      },
      periodValid: isPeriodValid(user.subscription.periodStart, user.subscription.periodEnd),
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


