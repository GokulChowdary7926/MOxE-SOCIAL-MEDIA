import Story from '../../models/Story'
import User from '../../models/User'
import mongoose from 'mongoose'

interface StoryViewResult {
  alreadyViewed: boolean
  story: any
}

export class StoryManager {
  private storyTTL = 24 * 60 * 60 * 1000 // 24 hours
  private viewerLimit = 1000 // Max viewers per story

  async createStory(storyData: any) {
    const expiresAt = new Date(Date.now() + this.storyTTL)

    const story = new Story({
      ...storyData,
      expiresAt,
      views: [],
      viewCount: 0,
    })

    await story.save()

    // Schedule expiration check (MongoDB TTL will handle actual deletion)
    return story
  }

  async viewStory(
    storyId: mongoose.Types.ObjectId | string,
    viewerId: mongoose.Types.ObjectId | string
  ): Promise<StoryViewResult> {
    const story = await Story.findById(storyId)

    if (!story || story.expiresAt < new Date()) {
      throw new Error('Story not found or expired')
    }

    // Check if already viewed
    const viewerIdObj =
      typeof viewerId === 'string'
        ? new mongoose.Types.ObjectId(viewerId)
        : viewerId
    const hasViewed = story.views?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === viewerIdObj.toString()
    )

    if (hasViewed) {
      return { alreadyViewed: true, story }
    }

    // Add to viewers (with rate limiting)
    if ((story.views?.length || 0) < this.viewerLimit) {
      if (!story.views) story.views = []
      story.views.push(viewerIdObj)
      story.viewCount = (story.viewCount || 0) + 1

      await story.save()
    }

    return { alreadyViewed: false, story }
  }

  async getActiveStoriesForUser(userId: mongoose.Types.ObjectId | string) {
    return await Story.find({
      author: userId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean()
  }

  async getStoryFeed(viewerId: mongoose.Types.ObjectId | string) {
    // Get stories from followed users
    const viewer = await User.findById(viewerId)
      .select('following closeFriends')
      .lean()

    if (!viewer) return []

    const followingIds = viewer.following || []
    const closeFriendIds = viewer.closeFriends || []

    const stories = await Story.find({
      author: { $in: followingIds },
      expiresAt: { $gt: new Date() },
      $or: [
        { 'visibility.type': 'public' },
        {
          'visibility.type': 'followers',
          author: { $in: followingIds },
        },
        {
          'visibility.type': 'close_friends',
          author: { $in: closeFriendIds },
        },
      ],
    })
      .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    // Group by user and add viewing progress
    const groupedStories = this.groupStoriesByUser(stories, viewerId)

    return groupedStories
  }

  groupStoriesByUser(stories: any[], viewerId: mongoose.Types.ObjectId | string) {
    const userStories: { [key: string]: any } = {}
    const viewerIdStr = viewerId.toString()

    stories.forEach((story) => {
      const userId = story.author?._id?.toString() || story.author?.toString()
      if (!userId) return

      if (!userStories[userId]) {
        userStories[userId] = {
          user: story.author,
          stories: [],
          hasUnviewed: false,
        }
      }

      // Check if viewer has seen this story
      const hasViewed = story.views?.some(
        (id: mongoose.Types.ObjectId) => id.toString() === viewerIdStr
      )
      if (!hasViewed) {
        userStories[userId].hasUnviewed = true
      }

      userStories[userId].stories.push({
        ...story,
        hasViewed,
        progress: this.calculateStoryProgress(story),
      })
    })

    return Object.values(userStories)
  }

  calculateStoryProgress(story: any): number {
    const now = new Date()
    const created = new Date(story.createdAt)
    const expires = new Date(story.expiresAt)

    const totalDuration = expires.getTime() - created.getTime()
    const elapsed = now.getTime() - created.getTime()

    return Math.min((elapsed / totalDuration) * 100, 100)
  }

  async cleanupExpiredStories() {
    // MongoDB TTL index handles this automatically, but we can add manual cleanup
    const deleted = await Story.deleteMany({
      expiresAt: { $lt: new Date() },
    })

    return deleted.deletedCount
  }
}

export default new StoryManager()

