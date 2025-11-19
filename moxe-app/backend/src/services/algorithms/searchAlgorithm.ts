import User from '../../models/User'
import Post from '../../models/Post'
import mongoose from 'mongoose'

interface SearchOptions {
  type?: 'all' | 'users' | 'posts' | 'hashtags' | 'locations'
  page?: number
  limit?: number
}

interface SearchResults {
  users: any[]
  posts: any[]
  hashtags: any[]
  locations: any[]
}

export class SearchAlgorithm {
  private weights = {
    relevance: 0.4,
    popularity: 0.3,
    recency: 0.2,
    connection: 0.1,
  }

  async search(
    query: string,
    searcherId: mongoose.Types.ObjectId | string,
    options: SearchOptions = {}
  ): Promise<SearchResults> {
    const { type = 'all', page = 1, limit = 20 } = options

    const searchResults: SearchResults = {
      users: [],
      posts: [],
      hashtags: [],
      locations: [],
    }

    // Parallel search across all types
    if (type === 'all' || type === 'users') {
      searchResults.users = await this.searchUsers(query, searcherId, page, limit)
    }

    if (type === 'all' || type === 'posts') {
      searchResults.posts = await this.searchPosts(query, searcherId, page, limit)
    }

    if (type === 'all' || type === 'hashtags') {
      searchResults.hashtags = await this.searchHashtags(query, page, limit)
    }

    if (type === 'all' || type === 'locations') {
      searchResults.locations = await this.searchLocations(query, page, limit)
    }

    return searchResults
  }

  async searchUsers(
    query: string,
    searcherId: mongoose.Types.ObjectId | string,
    page: number,
    limit: number
  ) {
    const searchRegex = new RegExp(query, 'i')

    let users = await User.find({
      $or: [
        { username: searchRegex },
        { 'profile.username': searchRegex },
        { 'profile.fullName': searchRegex },
        { 'profile.bio': searchRegex },
      ],
      deactivatedAt: { $exists: false },
    })
      .select(
        'username profile.username profile.fullName profile.avatar profile.bio profile.isVerified followers following'
      )
      .lean()

    // Calculate relevance scores
    const scoredUsers = await Promise.all(
      users.map(async (user) => {
        const score = await this.calculateUserRelevance(user, query, searcherId)
        return { ...user, _score: score }
      })
    )

    // Sort by relevance and paginate
    return scoredUsers
      .sort((a, b) => b._score - a._score)
      .slice((page - 1) * limit, page * limit)
  }

  async calculateUserRelevance(
    user: any,
    query: string,
    searcherId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    let score = 0
    const queryLower = query.toLowerCase()

    // Username match (exact match gets highest score)
    const username = user.username || user.profile?.username || ''
    const usernameMatch = username.toLowerCase() === queryLower
    if (usernameMatch) score += 0.5

    // Display name match
    const displayName = user.profile?.fullName || ''
    const displayNameMatch = displayName.toLowerCase().includes(queryLower)
    if (displayNameMatch) score += 0.3

    // Bio match
    const bio = user.profile?.bio || ''
    const bioMatch = bio.toLowerCase().includes(queryLower)
    if (bioMatch) score += 0.1

    // Popularity factor
    const followersCount = user.followers?.length || 0
    const popularity = Math.min(followersCount / 1000, 1) * 0.3
    score += popularity

    // Connection factor
    const connectionScore = await this.calculateConnectionScore(
      user._id,
      searcherId
    )
    score += connectionScore * 0.1

    return Math.min(score, 1.0)
  }

  async calculateConnectionScore(
    targetUserId: mongoose.Types.ObjectId | string,
    searcherId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    if (targetUserId.toString() === searcherId.toString()) return 1.0

    const searcher = await User.findById(searcherId)
      .select('following closeFriends')
      .lean()

    if (!searcher) return 0

    const targetIdStr = targetUserId.toString()
    const isFollowing = searcher.following?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === targetIdStr
    )
    const isCloseFriend = searcher.closeFriends?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === targetIdStr
    )

    if (isCloseFriend) return 0.8
    if (isFollowing) return 0.4

    // Check for mutual connections
    const target = await User.findById(targetUserId).select('following').lean()
    const isMutual = target?.following?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === searcherId.toString()
    )

    if (isMutual) return 0.6

    return 0.1
  }

  async searchPosts(
    query: string,
    searcherId: mongoose.Types.ObjectId | string,
    page: number,
    limit: number
  ) {
    const searchRegex = new RegExp(query, 'i')

    let posts = await Post.find({
      $or: [
        { 'content.text': searchRegex },
        { hashtags: { $in: [searchRegex] } },
        { 'location.name': searchRegex },
      ],
      'visibility.type': { $in: ['public', 'followers'] },
      isHidden: false,
      isArchived: false,
    })
      .populate('author', 'username profile.fullName profile.avatar profile.isVerified')
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Get more for filtering
      .lean()

    // Filter by privacy settings
    const searcher = await User.findById(searcherId).select('following').lean()
    const followingIds = searcher?.following?.map((id: mongoose.Types.ObjectId) =>
      id.toString()
    ) || []

    posts = posts.filter((post) => {
      if (post.visibility?.type === 'public') return true
      if (post.visibility?.type === 'followers') {
        const authorId = post.author?._id?.toString() || post.author?.toString()
        return followingIds.includes(authorId)
      }
      return false
    })

    // Calculate relevance scores
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const score = await this.calculatePostRelevance(post, query, searcherId)
        return { ...post, _score: score }
      })
    )

    return scoredPosts
      .sort((a, b) => b._score - a._score)
      .slice((page - 1) * limit, page * limit)
  }

  async calculatePostRelevance(
    post: any,
    query: string,
    searcherId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    let score = 0
    const queryLower = query.toLowerCase()

    // Text match
    const text = post.content?.text || ''
    if (text.toLowerCase().includes(queryLower)) score += 0.4

    // Hashtag match
    const hashtagMatch = post.hashtags?.some((tag: string) =>
      tag.toLowerCase().includes(queryLower)
    )
    if (hashtagMatch) score += 0.3

    // Location match
    const locationMatch = post.location?.name?.toLowerCase().includes(queryLower)
    if (locationMatch) score += 0.2

    // Engagement factor
    const likesCount = post.engagement?.likes?.length || 0
    const commentsCount = post.engagement?.comments?.length || 0
    const engagementScore = Math.min((likesCount + commentsCount) / 100, 1) * 0.1
    score += engagementScore

    return Math.min(score, 1.0)
  }

  async searchHashtags(query: string, page: number, limit: number) {
    const searchRegex = new RegExp(query, 'i')

    // Aggregate hashtags from posts
    const hashtagData = await Post.aggregate([
      { $unwind: '$hashtags' },
      { $match: { hashtags: searchRegex } },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          recentPosts: { $push: '$$ROOT' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])

    return hashtagData.map((item) => ({
      hashtag: item._id,
      postCount: item.count,
      recentPosts: item.recentPosts.slice(0, 5),
    }))
  }

  async searchLocations(query: string, page: number, limit: number) {
    const searchRegex = new RegExp(query, 'i')

    // Aggregate locations from posts
    const locationData = await Post.aggregate([
      { $match: { 'location.name': searchRegex } },
      {
        $group: {
          _id: '$location.name',
          coordinates: { $first: '$location.coordinates' },
          address: { $first: '$location.address' },
          postCount: { $sum: 1 },
        },
      },
      { $sort: { postCount: -1 } },
      { $limit: limit },
    ])

    return locationData.map((item) => ({
      name: item._id,
      coordinates: item.coordinates,
      address: item.address,
      postCount: item.postCount,
    }))
  }
}

export default new SearchAlgorithm()

