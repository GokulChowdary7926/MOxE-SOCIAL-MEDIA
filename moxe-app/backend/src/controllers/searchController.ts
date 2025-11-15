import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Post from '../models/Post'
import User from '../models/User'

export const searchAll = async (req: AuthRequest, res: Response) => {
  try {
    const { q, type } = req.query
    const query = (q as string)?.trim()

    if (!query || query.length < 2) {
      return res.json({
        users: [],
        posts: [],
        hashtags: [],
      })
    }

    const searchRegex = new RegExp(query, 'i')
    const results: any = {
      users: [],
      posts: [],
      hashtags: [],
    }

    // Search users
    if (!type || type === 'users' || type === 'all') {
      const users = await User.find({
        $or: [
          { 'profile.username': searchRegex },
          { 'profile.fullName': searchRegex },
          { 'profile.bio': searchRegex },
        ],
        _id: { $ne: req.user._id }, // Exclude current user
      })
        .select('profile subscription')
        .limit(10)
        .lean()

      results.users = users.map((user: any) => ({
        _id: user._id,
        username: user.profile?.username,
        fullName: user.profile?.fullName,
        avatar: user.profile?.avatar,
        bio: user.profile?.bio,
        isVerified: user.profile?.isVerified,
        subscription: user.subscription,
      }))
    }

    // Search posts
    if (!type || type === 'posts' || type === 'all') {
      const posts = await Post.find({
        $or: [
          { 'content.text': searchRegex },
          { 'content.caption': searchRegex },
        ],
        isArchived: false,
        isHidden: false,
      })
        .populate('author', 'profile subscription')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

      results.posts = posts
    }

    // Search hashtags (extract from posts)
    if (!type || type === 'hashtags' || type === 'all') {
      const hashtagRegex = new RegExp(`#${query}`, 'i')
      const postsWithHashtags = await Post.find({
        $or: [
          { 'content.text': hashtagRegex },
          { 'content.caption': hashtagRegex },
        ],
        isArchived: false,
      })
        .select('content')
        .limit(50)
        .lean()

      // Extract unique hashtags
      const hashtagMap = new Map<string, number>()
      postsWithHashtags.forEach((post: any) => {
        const text = (post.content?.text || post.content?.caption || '').toLowerCase()
        const hashtags = text.match(/#\w+/g) || []
        hashtags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
          }
        })
      })

      results.hashtags = Array.from(hashtagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    res.json(results)
  } catch (error: any) {
    console.error('Search error:', error)
    res.status(500).json({ message: error.message || 'Search failed' })
  }
}

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    const query = (q as string)?.trim()

    if (!query || query.length < 2) {
      return res.json({ users: [] })
    }

    const searchRegex = new RegExp(query, 'i')
    const users = await User.find({
      $or: [
        { 'profile.username': searchRegex },
        { 'profile.fullName': searchRegex },
        { 'profile.bio': searchRegex },
      ],
      _id: { $ne: req.user._id },
    })
      .select('profile subscription')
      .limit(20)
      .lean()

    const results = users.map((user: any) => ({
      _id: user._id,
      username: user.profile?.username,
      fullName: user.profile?.fullName,
      avatar: user.profile?.avatar,
      bio: user.profile?.bio,
      isVerified: user.profile?.isVerified,
      subscription: user.subscription,
    }))

    res.json({ users: results })
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'User search failed' })
  }
}

export const searchPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    const query = (q as string)?.trim()

    if (!query || query.length < 2) {
      return res.json({ posts: [] })
    }

    const searchRegex = new RegExp(query, 'i')
    const posts = await Post.find({
      $or: [
        { 'content.text': searchRegex },
        { 'content.caption': searchRegex },
      ],
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Post search failed' })
  }
}

export const searchHashtags = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    const query = (q as string)?.trim()

    if (!query || query.length < 1) {
      return res.json({ hashtags: [] })
    }

    const hashtagRegex = new RegExp(`#${query}`, 'i')
    const postsWithHashtags = await Post.find({
      $or: [
        { 'content.text': hashtagRegex },
        { 'content.caption': hashtagRegex },
      ],
      isArchived: false,
    })
      .select('content')
      .limit(100)
      .lean()

    // Extract unique hashtags
    const hashtagMap = new Map<string, number>()
    postsWithHashtags.forEach((post: any) => {
      const text = (post.content?.text || post.content?.caption || '').toLowerCase()
      const hashtags = text.match(/#\w+/g) || []
      hashtags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
        }
      })
    })

    const hashtags = Array.from(hashtagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    res.json({ hashtags })
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Hashtag search failed' })
  }
}


