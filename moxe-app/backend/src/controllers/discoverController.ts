import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Post from '../models/Post'
import User from '../models/User'
import mongoose from 'mongoose'

export const getForYouFeed = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1)
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10), 1), 50)

    // Signals: following authors get a boost; recent and engaged posts preferred
    const following = (user.following || []).map((id: any) => new mongoose.Types.ObjectId(id))

    const posts = await Post.aggregate([
      {
        $match: {
          isArchived: false,
          isHidden: false,
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              // recency score: newer posts higher
              { $multiply: [{ $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24] }, -1] },
              // engagement score
              { $multiply: [{ $size: { $ifNull: ['$engagement.likes', []] } }, 0.5] },
              { $multiply: [{ $size: { $ifNull: ['$engagement.comments', []] } }, 0.7] },
              // following boost
              {
                $cond: [{ $in: ['$author', following] }, 10, 0],
              },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ])

    const populated = await Post.populate(posts, { path: 'author', select: 'profile subscription' })

    res.json({ posts: populated, page, limit })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrending = async (req: AuthRequest, res: Response) => {
  try {
    // Trending hashtags in last 24h by count
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, isArchived: false, isHidden: false } },
      { $unwind: '$hashtags' },
      { $group: { _id: { $toLower: '$hashtags' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    res.json({ trending: trending.map((t) => ({ hashtag: t._id, count: t.count })) })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getPeopleRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const following = user.following || []
    const followingIds = following.map((id: any) => id.toString())

    // Recommend users not already followed, ranked by follower count
    const users = await User.aggregate([
      {
        $match: {
          _id: { $nin: [new mongoose.Types.ObjectId(req.user._id), ...following.map((f: any) => new mongoose.Types.ObjectId(f))] },
        },
      },
      {
        $addFields: {
          followersCount: { $size: { $ifNull: ['$followers', []] } },
        },
      },
      { $sort: { followersCount: -1 } },
      { $limit: 20 },
      { $project: { profile: 1, followersCount: 1 } },
    ])

    const recommendations = users.map((u: any) => ({
      _id: u._id,
      profile: u.profile,
      followersCount: u.followersCount || 0,
    }))

    res.json({ users: recommendations })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrendingHashtags = async (req: AuthRequest, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, isArchived: false, isHidden: false } },
      { $unwind: '$hashtags' },
      { $group: { _id: { $toLower: '$hashtags' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    const hashtags = tags.map((t) => ({ name: t._id, postCount: t.count }))
    res.json({ hashtags })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { q, page = '1', limit = '20' } = req.query as any
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query required' })
    }

    const query = q.trim()
    const pageNum = Math.max(parseInt(String(page), 10), 1)
    const perPage = Math.min(Math.max(parseInt(String(limit), 10), 1), 50)

    // Search users
    const users = await User.find({
      $or: [
        { 'profile.username': { $regex: query, $options: 'i' } },
        { 'profile.fullName': { $regex: query, $options: 'i' } },
      ],
    })
      .select('profile followers')
      .limit(10)

    // Search posts (caption keywords + hashtag text)
    const posts = await Post.find({
      $or: [
        { 'content.text': { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } },
        { 'location.name': { $regex: query, $options: 'i' } },
      ],
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)

    // Search hashtags (distinct)
    const hashtags = await Post.distinct('hashtags', {
      hashtags: { $in: [new RegExp(query, 'i')] },
    })

    // Search locations (distinct location names if present)
    const locations = await Post.aggregate([
      { $match: { 'location.name': { $regex: query, $options: 'i' } } },
      { $group: { _id: '$location.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    res.json({
      users: users.map((u: any) => ({
        _id: u._id,
        profile: u.profile,
        followersCount: u.followers?.length || 0,
      })),
      posts,
      hashtags: hashtags.slice(0, 10).map((tag: string) => ({
        _id: tag,
        name: tag,
        postCount: 0, // Could be calculated if needed
      })),
      locations: locations.map((l: any) => ({ name: l._id, count: l.count })),
      page: pageNum,
      limit: perPage,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


