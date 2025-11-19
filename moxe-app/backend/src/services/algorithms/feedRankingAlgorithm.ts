import Post from '../../models/Post'
import User from '../../models/User'
import Comment from '../../models/Comment'
import mongoose from 'mongoose'

interface PostScore {
  score: number
  breakdown: {
    recency: number
    engagement: number
    relationship: number
    contentQuality: number
    userPreferences: number
  }
  postId: mongoose.Types.ObjectId
}

interface FeedOptions {
  page?: number
  limit?: number
  contentType?: 'all' | 'post' | 'reel' | 'story'
}

interface Context {
  deviceType?: 'mobile' | 'desktop' | 'tablet'
  userActivity?: 'high' | 'medium' | 'low'
}

export class FeedRankingAlgorithm {
  private weights = {
    recency: 0.25,
    engagement: 0.35,
    relationship: 0.20,
    contentQuality: 0.15,
    userPreferences: 0.05,
  }

  async calculatePostScore(
    post: any,
    user: any,
    context: Context = { deviceType: 'mobile', userActivity: 'medium' }
  ): Promise<PostScore> {
    const scores = {
      recency: this.calculateRecencyScore(post.createdAt),
      engagement: await this.calculateEngagementScore(post),
      relationship: await this.calculateRelationshipScore(
        post.author,
        user._id || user.id
      ),
      contentQuality: this.calculateContentQualityScore(post),
      userPreferences: await this.calculatePreferenceScore(post, user._id || user.id),
    }

    // Apply weights and calculate final score
    let finalScore = 0
    for (const [factor, weight] of Object.entries(this.weights)) {
      finalScore += scores[factor as keyof typeof scores] * weight
    }

    // Apply context modifiers
    finalScore *= this.getContextModifiers(context)

    return {
      score: finalScore,
      breakdown: scores,
      postId: post._id,
    }
  }

  calculateRecencyScore(createdAt: Date | string): number {
    const now = new Date()
    const postDate = new Date(createdAt)
    const hoursAgo = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)

    // Exponential decay - newer posts get higher scores
    return Math.exp(-hoursAgo / 24) // Half-life of 24 hours
  }

  async calculateEngagementScore(post: any): Promise<number> {
    const likesCount = post.engagement?.likes?.length || 0
    const commentsCount = post.engagement?.comments?.length || 0
    const sharesCount = post.engagement?.shares || 0
    const savesCount = post.engagement?.saves?.length || 0
    const viewCount = post.engagement?.views || 0

    // Normalize engagement metrics
    const maxPossible = await this.getMaxEngagementMetrics()

    const normalizedLikes = Math.min(likesCount / maxPossible.likes, 1)
    const normalizedComments = Math.min(commentsCount / maxPossible.comments, 1)
    const normalizedShares = Math.min(sharesCount / maxPossible.shares, 1)
    const normalizedSaves = Math.min(savesCount / maxPossible.saves, 1)
    const normalizedViews = Math.min(viewCount / maxPossible.views, 1)

    // Calculate engagement rate
    const engagementRate = viewCount > 0
      ? (likesCount + commentsCount + sharesCount + savesCount) / viewCount
      : 0

    // Weight different engagement types
    return (
      normalizedLikes * 0.3 +
      normalizedComments * 0.25 +
      normalizedShares * 0.2 +
      normalizedSaves * 0.15 +
      Math.min(engagementRate, 1) * 0.1
    )
  }

  private async getMaxEngagementMetrics() {
    // Get top engagement metrics from database for normalization
    const topPost = await Post.findOne()
      .sort({ 'engagement.likes': -1 })
      .select('engagement')
      .lean()

    const likesCount = Array.isArray(topPost?.engagement?.likes) 
      ? topPost.engagement.likes.length 
      : (topPost?.engagement?.likes || 0)
    const commentsCount = Array.isArray(topPost?.engagement?.comments) 
      ? topPost.engagement.comments.length 
      : (typeof topPost?.engagement?.comments === 'number' ? topPost.engagement.comments : 0)
    const savesCount = Array.isArray(topPost?.engagement?.saves) 
      ? topPost.engagement.saves.length 
      : (topPost?.engagement?.saves || 0)

    return {
      likes: Math.max(likesCount * 1.5, 1000),
      comments: Math.max(commentsCount * 1.5, 100),
      shares: Math.max((topPost?.engagement?.shares || 0) * 1.5, 500),
      saves: Math.max(savesCount * 1.5, 200),
      views: Math.max((topPost?.engagement?.views || 0) * 1.5, 10000),
    }
  }

  async calculateRelationshipScore(
    authorId: mongoose.Types.ObjectId | string,
    viewerId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    if (authorId.toString() === viewerId.toString()) return 1.0 // Own content

    const viewer = await User.findById(viewerId).select('following closeFriends').lean()
    if (!viewer) return 0.1

    const authorIdStr = authorId.toString()
    const isFollowing = viewer.following?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === authorIdStr
    )
    const isCloseFriend = viewer.closeFriends?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === authorIdStr
    )

    if (!isFollowing) return 0.1 // No relationship

    let score = 0.3 // Base score for following

    // Close friends boost
    if (isCloseFriend) score += 0.3

    // Check if mutual follow
    const author = await User.findById(authorId).select('following').lean()
    const isMutual = author?.following?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === viewerId.toString()
    )
    if (isMutual) score += 0.2

    // Engagement history boost
    const engagementHistory = await this.getEngagementHistory(viewerId, authorId)
    score += Math.min(engagementHistory * 0.2, 0.2)

    return Math.min(score, 1.0)
  }

  private async getEngagementHistory(
    viewerId: mongoose.Types.ObjectId | string,
    authorId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    // Count interactions with author's posts in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const authorPosts = await Post.find({
      author: authorId,
      createdAt: { $gte: thirtyDaysAgo },
    }).select('_id').lean()

    const postIds = authorPosts.map((p) => p._id)

    // Count likes, comments, shares on author's posts
    const likedPosts = await Post.countDocuments({
      _id: { $in: postIds },
      'engagement.likes': viewerId,
    })

    const commentedPosts = await Comment.countDocuments({
      post: { $in: postIds },
      author: viewerId,
    })

    const totalInteractions = likedPosts + commentedPosts
    const totalPosts = authorPosts.length

    // Normalize to 0-1 scale
    return totalPosts > 0 ? Math.min(totalInteractions / totalPosts, 1) : 0
  }

  calculateContentQualityScore(post: any): number {
    let score = 0.5 // Base score

    // Media quality
    if (post.content?.media && post.content.media.length > 0) {
      const hasVideo = post.content.media.some((m: any) => m.type === 'video')
      if (hasVideo) score += 0.2
    }

    // Content completeness
    if (post.content?.text && post.content.text.length > 10) score += 0.1
    if (post.hashtags && post.hashtags.length > 0) score += 0.1

    // User reputation (if author has good engagement)
    const likesCount = post.engagement?.likes?.length || 0
    const viewsCount = post.engagement?.views || 0
    if (viewsCount > 0) {
      const engagementRate = likesCount / viewsCount
      if (engagementRate > 0.1) score += 0.1 // High engagement rate
    }

    return Math.min(score, 1.0)
  }

  async calculatePreferenceScore(
    post: any,
    userId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    // For now, return neutral score
    // Can be enhanced with user preference tracking
    return 0.5
  }

  getContextModifiers(context: Context): number {
    let modifier = 1.0

    // Time of day effects
    const hour = new Date().getHours()
    if (hour >= 22 || hour <= 6) modifier *= 0.8 // Reduce score during night

    // Device type effects
    if (context.deviceType === 'mobile') modifier *= 1.1 // Boost for mobile

    // User activity level
    if (context.userActivity === 'high') modifier *= 1.2
    if (context.userActivity === 'low') modifier *= 0.8

    return modifier
  }

  async generateFeed(
    userId: mongoose.Types.ObjectId | string,
    options: FeedOptions = {}
  ) {
    const { page = 1, limit = 20, contentType = 'all' } = options

    // Get candidate posts
    const candidatePosts = await this.getCandidatePosts(userId, contentType)

    // Get user for relationship scoring
    const user = await User.findById(userId).lean()

    // Calculate scores for each post
    const scoredPosts = await Promise.all(
      candidatePosts.map(async (post) => {
        const scoreData = await this.calculatePostScore(
          post,
          user || { _id: userId },
          {
            deviceType: 'mobile',
            userActivity: 'medium',
          }
        )
        return { ...post.toObject(), _score: scoreData }
      })
    )

    // Sort by score and paginate
    const sortedPosts = scoredPosts.sort(
      (a, b) => b._score.score - a._score.score
    )
    const paginatedPosts = sortedPosts.slice(
      (page - 1) * limit,
      page * limit
    )

    // Add diversity (ensure not too many posts from same user)
    const diversifiedPosts = this.applyDiversity(paginatedPosts, userId)

    return {
      posts: diversifiedPosts,
      hasMore: sortedPosts.length > page * limit,
      nextPage: page + 1,
      algorithmVersion: 'v2.1',
    }
  }

  private async getCandidatePosts(
    userId: mongoose.Types.ObjectId | string,
    contentType: string
  ) {
    const user = await User.findById(userId).select('following blockedUsers').lean()
    if (!user) return []

    const followingIds = user.following || []
    const blockedUserIds = user.blockedUsers || []

    // Base query
    const query: any = {
      author: { $in: followingIds, $nin: blockedUserIds },
      visibility: { $in: ['public', 'followers'] },
      isHidden: false,
      isArchived: false,
    }

    // Filter by content type
    if (contentType !== 'all') {
      query['content.type'] = contentType
    }

    // Exclude expired posts
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ]

    return await Post.find(query)
      .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
      .sort({ createdAt: -1 })
      .limit(100) // Get more candidates for better ranking
      .lean()
  }

  applyDiversity(
    posts: any[],
    userId: mongoose.Types.ObjectId | string
  ): any[] {
    const userPostCount: { [key: string]: number } = {}
    const diversified: any[] = []

    for (const post of posts) {
      const authorId = post.author?._id?.toString() || post.author?.toString()
      if (!authorId) continue

      userPostCount[authorId] = (userPostCount[authorId] || 0) + 1

      // Allow max 3 posts from same user in feed
      if (userPostCount[authorId] <= 3 || authorId === userId.toString()) {
        diversified.push(post)
      }

      if (diversified.length >= 20) break
    }

    return diversified
  }
}

export default new FeedRankingAlgorithm()

