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

    // Algorithmic feed based on user interests, engagement, etc.
    const following = user.following || []
    const followingIds = following.map((id: any) => id.toString())

    const posts = await Post.find({
      $or: [
        { author: { $in: followingIds } },
        { visibility: { type: 'public' } },
      ],
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(20)

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrending = async (req: AuthRequest, res: Response) => {
  try {
    // Get trending hashtags and topics
    const trending = [
      { hashtag: 'moxe', count: 1250 },
      { hashtag: 'social', count: 980 },
      { hashtag: 'tech', count: 750 },
    ]

    res.json({ trending })
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

    // Recommend users not already followed
    const users = await User.find({
      _id: { $nin: [req.user._id, ...followingIds] },
      isActive: true,
    })
      .select('profile followers')
      .limit(20)

    const recommendations = users.map((u: any) => ({
      _id: u._id,
      profile: u.profile,
      followersCount: u.followers?.length || 0,
    }))

    res.json({ users: recommendations })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrendingHashtags = async (req: AuthRequest, res: Response) => {
  try {
    // Get trending hashtags from posts
    const hashtags = [
      { _id: '1', name: 'moxe', postCount: 1250 },
      { _id: '2', name: 'social', postCount: 980 },
      { _id: '3', name: 'tech', postCount: 750 },
    ]

    res.json({ hashtags })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query required' })
    }

    const query = q.trim()

    // Search users
    const users = await User.find({
      $or: [
        { 'profile.username': { $regex: query, $options: 'i' } },
        { 'profile.fullName': { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    })
      .select('profile followers')
      .limit(10)

    // Search posts (caption keywords + hashtag text)
    const posts = await Post.find({
      $or: [
        { 'content.text': { $regex: query, $options: 'i' } },
        { 'content.hashtags': { $in: [new RegExp(query, 'i')] } },
        { 'location.name': { $regex: query, $options: 'i' } },
      ],
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .limit(20)

    // Search hashtags (distinct)
    const hashtags = await Post.distinct('content.hashtags', {
      'content.hashtags': { $in: [new RegExp(query, 'i')] },
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
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

