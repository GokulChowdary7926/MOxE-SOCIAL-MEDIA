import Post from '../../models/Post'
import Story from '../../models/Story'
import Comment from '../../models/Comment'
import User from '../../models/User'
import mongoose from 'mongoose'

interface EngagementData {
  userId: mongoose.Types.ObjectId | string
  targetType: 'post' | 'story' | 'comment' | 'user'
  targetId: mongoose.Types.ObjectId | string
  action: 'like' | 'comment' | 'share' | 'save' | 'view' | 'click'
  value?: any
  metadata?: {
    ipAddress?: string
    userAgent?: string
    location?: [number, number]
    deviceType?: string
  }
}

export class EngagementTracker {
  private engagementWindows = {
    immediate: 5 * 60 * 1000, // 5 minutes
    short: 60 * 60 * 1000, // 1 hour
    long: 24 * 60 * 60 * 1000, // 24 hours
  }

  async trackEngagement(engagementData: EngagementData) {
    // Update real-time metrics
    await this.updateRealtimeMetrics(engagementData)

    // Update algorithmic scores
    await this.updateAlgorithmicScores(engagementData)

    return engagementData
  }

  async updateRealtimeMetrics(engagement: EngagementData) {
    const { targetType, targetId, action } = engagement

    switch (targetType) {
      case 'post':
        await this.updatePostMetrics(targetId, action)
        break
      case 'story':
        await this.updateStoryMetrics(targetId, action)
        break
      case 'user':
        await this.updateUserMetrics(targetId, action)
        break
    }
  }

  async updatePostMetrics(
    postId: mongoose.Types.ObjectId | string,
    action: string
  ) {
    const updateFields: any = {}

    switch (action) {
      case 'like':
        // Handled in post controller
        break
      case 'comment':
        updateFields.$inc = { 'engagement.comments': 1 }
        break
      case 'share':
        updateFields.$inc = { 'engagement.shares': 1 }
        break
      case 'save':
        // Handled in saved posts
        break
      case 'view':
        updateFields.$inc = { 'engagement.views': 1 }
        break
    }

    if (Object.keys(updateFields).length > 0) {
      // Update engagement rate
      const post = await Post.findById(postId).select('engagement').lean()
      if (post) {
        const engagementRate = await this.calculateEngagementRate(postId)
        updateFields.$set = {
          'metrics.lastEngagedAt': new Date(),
        }
        await Post.findByIdAndUpdate(postId, updateFields)
      }
    }
  }

  async calculateEngagementRate(
    postId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    const post = await Post.findById(postId).select('engagement').lean()
    if (!post) return 0

    const likesCount = Array.isArray(post.engagement?.likes) ? post.engagement.likes.length : 0
    const commentsCount = Array.isArray(post.engagement?.comments) ? post.engagement.comments.length : (typeof post.engagement?.comments === 'number' ? post.engagement.comments : 0)
    const sharesCount = post.engagement?.shares || 0
    const savesCount = Array.isArray(post.engagement?.saves) ? post.engagement.saves.length : 0
    const viewCount = post.engagement?.views || 0

    const totalEngagements = likesCount + commentsCount + sharesCount + savesCount
    const reach = viewCount || 1

    return (totalEngagements / reach) * 100
  }

  async updateStoryMetrics(
    storyId: mongoose.Types.ObjectId | string,
    action: string
  ) {
    // Story metrics are updated in story controller
  }

  async updateUserMetrics(
    userId: mongoose.Types.ObjectId | string,
    action: string
  ) {
    // User metrics can be updated here
  }

  async updateAlgorithmicScores(engagement: EngagementData) {
    // Update feed algorithm scores based on engagement
    if (engagement.targetType === 'post') {
      const post = await Post.findById(engagement.targetId).lean()
      if (post) {
        // Recalculate algorithm score
        // This would integrate with FeedRankingAlgorithm
      }
    }
  }

  async getEngagementAnalytics(
    userId: mongoose.Types.ObjectId | string,
    period: string = '7d'
  ) {
    const dateRange = this.getDateRange(period)

    // Get user's posts
    const userPosts = await Post.find({
      author: userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    }).select('engagement createdAt').lean()

    const analytics = {
      totalPosts: userPosts.length,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalSaves: 0,
      totalViews: 0,
      averageEngagementRate: 0,
      dailyBreakdown: [] as any[],
    }

    userPosts.forEach((post) => {
      analytics.totalLikes += Array.isArray(post.engagement?.likes) ? post.engagement.likes.length : 0
      analytics.totalComments += Array.isArray(post.engagement?.comments) ? post.engagement.comments.length : (typeof post.engagement?.comments === 'number' ? post.engagement.comments : 0)
      analytics.totalShares += post.engagement?.shares || 0
      analytics.totalSaves += Array.isArray(post.engagement?.saves) ? post.engagement.saves.length : 0
      analytics.totalViews += post.engagement?.views || 0
    })

    if (userPosts.length > 0) {
      const totalEngagements =
        analytics.totalLikes +
        analytics.totalComments +
        analytics.totalShares +
        analytics.totalSaves
      analytics.averageEngagementRate =
        (totalEngagements / analytics.totalViews) * 100 || 0
    }

    return analytics
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '1d':
        start.setDate(start.getDate() - 1)
        break
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      default:
        start.setDate(start.getDate() - 7)
    }

    return { start, end }
  }
}

export default new EngagementTracker()

