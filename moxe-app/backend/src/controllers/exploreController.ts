import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Post from '../models/Post'
import User from '../models/User'

export const getTrendingTopics = async (req: AuthRequest, res: Response) => {
  try {
    // In production, analyze posts to find trending hashtags
    // For now, return mock trending topics
    const trendingTopics = [
      { tag: '#WeekendVibes', count: 1250 },
      { tag: '#CoffeeLovers', count: 980 },
      { tag: '#WorkFromCafe', count: 750 },
      { tag: '#LocalBusiness', count: 620 },
      { tag: '#MOXECommunity', count: 450 },
    ]

    res.json({ trendingTopics })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getNearbyPlaces = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user || !user.location?.latitude || !user.location?.longitude) {
      return res.json({ places: [] })
    }

    // In production, integrate with Google Places API or similar
    // For now, return mock nearby places
    const places = [
      {
        name: "Maria's Café",
        type: 'Coffee Shop',
        rating: 4.8,
        distance: '150m',
        latitude: user.location.latitude + 0.001,
        longitude: user.location.longitude + 0.001,
      },
      {
        name: 'Central Park',
        type: 'Park',
        rating: 4.5,
        distance: '350m',
        latitude: user.location.latitude + 0.002,
        longitude: user.location.longitude + 0.002,
      },
      {
        name: 'City Library',
        type: 'Library',
        rating: 4.7,
        distance: '600m',
        latitude: user.location.latitude + 0.003,
        longitude: user.location.longitude + 0.003,
      },
    ]

    res.json({ places })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const discoverContent = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query

    // Get posts based on category/tags
    const posts = await Post.find({
      isArchived: false,
      'content.text': category ? { $regex: category, $options: 'i' } : undefined,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(20)

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


