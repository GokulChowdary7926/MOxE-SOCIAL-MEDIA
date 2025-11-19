import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Post from '../models/Post'
import User from '../models/User'
import mongoose from 'mongoose'
import feedRankingAlgorithm from '../services/algorithms/feedRankingAlgorithm'

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Feed request - User ID:', req.user._id)
    
    const user = await User.findById(req.user._id)
    if (!user) {
      console.error('User not found:', req.user._id)
      return res.status(404).json({ message: 'User not found' })
    }

    console.log('User found, following count:', user.following?.length || 0)

    // Get posts from users the current user follows - safe handling
    const following = user.following || []
    const followingIds = Array.isArray(following) 
      ? following.map((id: any) => {
          try {
            if (id && typeof id.toString === 'function') {
              return id.toString()
            }
            return String(id)
          } catch {
            return String(id)
          }
        }).filter((id: string) => id && id.length > 0)
      : []
    
    const userId = user._id ? (user._id as any).toString() : null
    if (!userId) {
      console.error('Invalid user ID')
      return res.status(500).json({ message: 'Invalid user ID' })
    }
    
    console.log('Following IDs:', followingIds.length)
    
    // Build query conditions - always include user's own posts
    const queryConditions: any[] = [
      { author: user._id }
    ]
    
    // Only add following conditions if user has followers
    if (followingIds.length > 0) {
      try {
        // Convert string IDs to ObjectIds for query
        const followingObjectIds = followingIds
          .map((id: string) => {
            try {
              return new mongoose.Types.ObjectId(id)
            } catch {
              return null
            }
          })
          .filter((id: any) => id !== null)
        
        if (followingObjectIds.length > 0) {
          queryConditions.push(
            // Public posts from followed users
            {
              author: { $in: followingObjectIds },
              'visibility.type': 'public',
            },
            // Follower-only posts from followed users
            {
              author: { $in: followingObjectIds },
              'visibility.type': 'followers',
            }
          )
        }
      } catch (queryBuildError) {
        console.error('Error building query conditions:', queryBuildError)
        // Continue with just user's own posts
      }
    }
    
    console.log('Query conditions count:', queryConditions.length)
    
    // Build query: Show user's own posts (all visibility types) + public/followers posts from others
    let posts: any[] = []
    try {
      // Build proper MongoDB query - combine $or with $and for other conditions
      const finalQuery: any = {
        $and: [
          { $or: queryConditions },
          {
            $or: [
              { isArchived: { $exists: false } },
              { isArchived: false }
            ]
          },
          {
            $or: [
              { isHidden: { $exists: false } },
              { isHidden: false }
            ]
          }
        ]
      }
      
      posts = await Post.find(finalQuery)
        .populate('author', 'profile subscription')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
        .exec()
      
      console.log('Posts found:', posts.length)
    } catch (queryError: any) {
      console.error('Post query error:', queryError)
      console.error('Query error details:', {
        message: queryError.message,
        stack: queryError.stack,
        name: queryError.name
      })
      // If query fails, try simpler query
      try {
        posts = await Post.find({ 
          author: user._id,
          $or: [
            { isArchived: { $exists: false } },
            { isArchived: false }
          ]
        })
          .populate('author', 'profile subscription')
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .exec()
        console.log('Fallback query successful, posts:', posts.length)
      } catch (fallbackError: any) {
        console.error('Fallback query also failed:', fallbackError.message)
        posts = []
      }
    }
    
    // Filter close_friends posts manually (check if current user is in author's close friends)
    let finalPosts: any[] = []
    try {
      const filteredPosts = await Promise.all(
        posts.map(async (post: any) => {
          try {
            // If it's user's own post, always include
            if (post.author && post.author._id) {
              const authorId = post.author._id.toString ? post.author._id.toString() : String(post.author._id)
              if (authorId === userId) {
                return post
              }
            }
            
            // If visibility is close_friends, check if user is in author's close friends
            if (post.visibility && post.visibility.type === 'close_friends' && post.author && post.author._id) {
              try {
                const author = await User.findById(post.author._id).lean()
                if (author && author.closeFriends && Array.isArray(author.closeFriends)) {
                  const isCloseFriend = author.closeFriends.some((id: any) => {
                    try {
                      const idStr = id.toString ? id.toString() : String(id)
                      return idStr === userId
                    } catch {
                      return String(id) === userId
                    }
                  })
                  if (isCloseFriend) {
                    return post
                  }
                }
                return null
              } catch (authorError) {
                console.error('Error checking author close friends:', authorError)
                return null
              }
            }
            
            // Include all other posts
            return post
          } catch (err) {
            console.error('Error filtering post:', err)
            return null
          }
        })
      )
      finalPosts = filteredPosts.filter((post: any) => post !== null && post !== undefined)
    } catch (filterError: any) {
      console.error('Filter posts error:', filterError)
      // If filtering fails, just use original posts
      finalPosts = posts
    }

    // Use advanced feed ranking algorithm if requested
    const useAlgorithm = req.query.algorithm === 'true' || req.query.algorithm === '1'
    
    if (useAlgorithm) {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const contentType = (req.query.contentType as string) || 'all'
        
        const feedResult = await feedRankingAlgorithm.generateFeed(req.user._id, {
          page,
          limit,
          contentType: contentType as any,
        })
        
        return res.json({
          posts: feedResult.posts,
          hasMore: feedResult.hasMore,
          nextPage: feedResult.nextPage,
          algorithmVersion: feedResult.algorithmVersion,
        })
      } catch (algorithmError: any) {
        console.error('Algorithm feed error:', algorithmError)
        // Fall through to simple ranking
      }
    }

    // Rank posts using a simple scoring function
    // Factors: recency, engagement, relationship strength, content type preference
    try {
      const now = Date.now()
      const userPreferences = {
        reelBoost: 1.15,
        storyBoost: 1.05,
        liveBoost: 1.2,
        postBoost: 1.0,
      }
      const followingSet = new Set(followingIds)

      finalPosts = finalPosts
        .map((p: any) => {
          const createdAt = new Date(p.createdAt || Date.now()).getTime()
          const hoursSince = Math.max(1, (now - createdAt) / (1000 * 60 * 60))
          const recencyScore = 1 / Math.pow(hoursSince, 0.6) // decays with time

          const likes = p.engagement?.likes?.length || 0
          const comments = p.comments?.length || 0
          const shares = p.engagement?.shares || 0
          const engagementScore = (likes * 1 + comments * 2 + shares * 3) / 100

          const authorId = p?.author?._id?.toString?.() || p?.author?.toString?.() || ''
          const relationshipScore = followingSet.has(authorId) ? 0.2 : 0

          const type = p.content?.type || 'post'
          const typeBoost =
            type === 'reel' ? userPreferences.reelBoost :
            type === 'story' ? userPreferences.storyBoost :
            type === 'live' ? userPreferences.liveBoost :
            userPreferences.postBoost

          const score = (recencyScore + engagementScore + relationshipScore) * typeBoost
          return { ...p, _rankScore: score }
        })
        .sort((a: any, b: any) => (b._rankScore || 0) - (a._rankScore || 0))
        .slice(0, 50)
    } catch (rankErr) {
      console.warn('Ranking failed, returning chronological feed:', (rankErr as any)?.message)
    }

    // Get stories for feed (include user's own stories)
    let stories: any[] = []
    try {
      const Story = require('../models/Story').default
      const storyAuthorIds: any[] = [user._id]
      
      if (followingIds.length > 0) {
        followingIds.forEach((id: string) => {
          try {
            storyAuthorIds.push(new mongoose.Types.ObjectId(id))
          } catch {
            // Skip invalid IDs
          }
        })
      }
      
      stories = await Story.find({
        author: { $in: storyAuthorIds },
        expiresAt: { $gt: new Date() },
      })
        .populate('author', 'profile subscription')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .catch(() => [])
    } catch (storiesError: any) {
      console.error('Stories query error:', storiesError)
      stories = []
    }

    console.log('Returning feed - Posts:', finalPosts.length, 'Stories:', stories.length)
    res.json({ posts: finalPosts, stories: stories || [] })
  } catch (error: any) {
    console.error('Feed error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      message: error.message || 'Failed to load feed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Create post request received')
    console.log('Request body keys:', Object.keys(req.body))
    console.log('Media array length:', req.body.media?.length || 0)
    
    const { text, media, visibility, contentType, mentions, hashtags, dsrProtected, shoppingTags } = req.body

    // Validate that post has content
    if (!text?.trim() && (!media || !Array.isArray(media) || media.length === 0)) {
      return res.status(400).json({ 
        message: 'Post must have text or media content' 
      })
    }

    // Validate content type
    const validContentTypes = ['post', 'story', 'reel', 'live']
    const contentTypeValid = contentType || 'post'
    if (!validContentTypes.includes(contentTypeValid)) {
      return res.status(400).json({ message: 'Invalid content type' })
    }

    // Validate and process media
    let processedMedia: any[] = []
    if (media && Array.isArray(media) && media.length > 0) {
      for (const item of media) {
        // Validate media item structure
        if (!item.url) {
          console.warn('Media item missing URL:', item)
          continue // Skip invalid media items
        }
        
        // Check if it's a base64 data URL
        const isBase64 = typeof item.url === 'string' && item.url.startsWith('data:')
        
        // Estimate size for base64 (actual size is ~33% larger than original)
        if (isBase64) {
          const base64Length = item.url.length
          const estimatedSize = (base64Length * 3) / 4 // Approximate original size
          
          // Warn if individual file is very large (>10MB estimated)
          if (estimatedSize > 10 * 1024 * 1024) {
            console.warn('Large media file detected:', estimatedSize / (1024 * 1024), 'MB')
          }
        }
        
        // Validate duration if present
        if (item.duration) {
          const maxDuration = 
            contentTypeValid === 'post' ? 45 :
            contentTypeValid === 'story' ? 30 :
            contentTypeValid === 'reel' ? 60 : 45
          
          if (item.duration > maxDuration) {
            return res.status(400).json({ 
              message: `Video duration exceeds limit. Max ${maxDuration} seconds for ${contentTypeValid}.` 
            })
          }
        }
        
        processedMedia.push({
          url: item.url,
          type: item.type || (item.url.startsWith('data:image') ? 'image' : item.url.startsWith('data:video') ? 'video' : 'file'),
          thumbnail: item.thumbnail || (item.type === 'image' ? item.url : null),
          duration: item.duration,
          size: item.size,
        })
      }
    }

    // Validate mentions (max 10)
    const mentionsArray = mentions || []
    if (mentionsArray.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 mentions allowed per post' })
    }

    // Validate hashtags (max 15)
    const hashtagsArray = hashtags || []
    if (hashtagsArray.length > 15) {
      return res.status(400).json({ message: 'Maximum 15 hashtags allowed per post' })
    }

    // Check user subscription for premium features
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Validate premium features
    if (req.body.isHidden && user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'Hidden posts feature requires a premium subscription (Star or Thick tier)' 
      })
    }

    if (req.body.isOneTimeView && user.subscription.tier === 'basic') {
      return res.status(403).json({ 
        message: 'One-time view feature requires a premium subscription (Star or Thick tier)' 
      })
    }

    // Handle visibility - can be string or object
    let visibilityType = 'public'
    let visibilityExcept: any[] = []
    
    if (typeof visibility === 'string') {
      visibilityType = visibility
    } else if (visibility && typeof visibility === 'object' && visibility.type) {
      visibilityType = visibility.type
      visibilityExcept = visibility.except || []
    }
    
    // Validate visibility type
    const validVisibilityTypes = ['public', 'followers', 'close_friends', 'private', 'only_me']
    if (!validVisibilityTypes.includes(visibilityType)) {
      visibilityType = 'public'
    }

    console.log('Creating post with:', {
      contentType: contentTypeValid,
      hasText: !!text,
      mediaCount: processedMedia.length,
      visibility: visibilityType,
    })

    const post = new Post({
      author: req.user._id,
      content: {
        type: contentTypeValid,
        text: text?.trim() || undefined,
        media: processedMedia,
        dsrProtected: dsrProtected || false,
        mentions: mentionsArray,
        hashtags: hashtagsArray,
        shoppingTags: shoppingTags || [],
      },
      visibility: {
        type: visibilityType,
        except: req.body.except || visibilityExcept,
      },
      isHidden: req.body.isHidden || false,
      isOneTimeView: req.body.isOneTimeView || false,
    })

    try {
      await post.save()
      console.log('Post saved successfully:', post._id)
    } catch (saveError: any) {
      console.error('Error saving post:', saveError)
      if (saveError.message?.includes('too large') || saveError.name === 'BSONError') {
        return res.status(413).json({ 
          message: 'Media files are too large. Please reduce file size and try again.' 
        })
      }
      throw saveError
    }
    await post.populate('author', 'profile subscription')

    // Emit Socket.io events for real-time updates
    const io = req.app.get('io')
    if (io) {
      const user = await User.findById(req.user._id)
      const postData = {
        post: post.toObject(),
        authorId: req.user._id,
        authorName: user?.profile?.fullName,
        timestamp: new Date(),
      }

      // Notify followers
      const followers = user?.followers || []
      if (Array.isArray(followers) && followers.length > 0) {
        followers.forEach((followerId: any) => {
          try {
            const id = followerId.toString ? followerId.toString() : String(followerId)
            io.to(`user:${id}`).emit('new_post', postData)
          } catch (err) {
            // Skip invalid IDs
          }
        })
      }

      // Broadcast to public if post is public
      if (post.visibility?.type === 'public') {
        io.emit('new_post_public', postData)
      }

      // Also emit post_created event for socket service handler
      io.emit('post_created', postData)
    }

    res.json({ post })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId).populate('author', 'profile')

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const userId = req.user._id
    const isLiked = post.engagement.likes.includes(userId)
    const isDisliked = post.engagement.dislikes.includes(userId)

    if (isLiked) {
      post.engagement.likes = post.engagement.likes.filter((id) => id.toString() !== userId.toString())
    } else {
      post.engagement.likes.push(userId)
      if (isDisliked) {
        post.engagement.dislikes = post.engagement.dislikes.filter((id) => id.toString() !== userId.toString())
      }
    }

    await post.save()

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io')
    if (io) {
      io.emit('post_liked', { 
        postId, 
        engagement: post.engagement,
        userId: userId.toString(),
        timestamp: new Date(),
      })
    }

    res.json({ engagement: post.engagement })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const dislikePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const userId = req.user._id
    const isDisliked = post.engagement.dislikes.includes(userId)
    const isLiked = post.engagement.likes.includes(userId)

    if (isDisliked) {
      post.engagement.dislikes = post.engagement.dislikes.filter((id) => id.toString() !== userId.toString())
    } else {
      post.engagement.dislikes.push(userId)
      if (isLiked) {
        post.engagement.likes = post.engagement.likes.filter((id) => id.toString() !== userId.toString())
      }
    }

    await post.save()

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io')
    if (io) {
      io.emit('post_disliked', { 
        postId, 
        engagement: post.engagement,
        userId: userId.toString(),
        timestamp: new Date(),
      })
    }

    res.json({ engagement: post.engagement })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const sharePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    post.engagement.shares = (post.engagement.shares || 0) + 1
    await post.save()

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io')
    if (io) {
      const user = await User.findById(req.user._id)
      io.emit('post_shared', {
        postId,
        sharerId: req.user._id,
        sharerName: user?.profile?.fullName,
        engagement: post.engagement,
        post: post.toObject(),
        timestamp: new Date(),
      })
    }

    res.json({ engagement: post.engagement })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const savePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const userId = req.user._id
    const isSaved = post.engagement.saves.includes(userId)

    if (isSaved) {
      post.engagement.saves = post.engagement.saves.filter((id) => id.toString() !== userId.toString())
    } else {
      post.engagement.saves.push(userId)
    }

    await post.save()

    const io = req.app.get('io')
    if (io) {
      io.emit('post_saved_update', {
        postId,
        userId,
        isSaved: !isSaved,
        engagement: post.engagement,
        timestamp: new Date(),
      })
    }

    res.json({ 
      message: isSaved ? 'Post unsaved' : 'Post saved',
      engagement: post.engagement 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Check if user owns the post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' })
    }

    await Post.findByIdAndDelete(req.params.postId)
    res.json({ message: 'Post deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const archivePost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only archive your own posts' })
    }

    post.isArchived = true
    await post.save()
    res.json({ message: 'Post archived successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const hidePost = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!user.hiddenPosts) {
      user.hiddenPosts = []
    }

    if (!user.hiddenPosts.includes(req.params.postId as any)) {
      user.hiddenPosts.push(req.params.postId as any)
      await user.save()
    }

    res.json({ message: 'Post hidden successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const reportPost = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Add report to post (you might want a separate Report model)
    if (!post.reports) {
      post.reports = []
    }

    post.reports.push({
      reportedBy: req.user._id,
      reason: reason || 'No reason provided',
      reportedAt: new Date(),
    } as any)

    await post.save()
    res.json({ message: 'Post reported successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const pinPost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only pin your own posts' })
    }

    // Unpin other posts first (only one pinned post allowed)
    await Post.updateMany(
      { author: req.user._id, isPinned: true },
      { isPinned: false }
    )

    post.isPinned = true
    await post.save()
    res.json({ message: 'Post pinned successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const hideFromProfile = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only hide your own posts' })
    }

    post.isHiddenFromProfile = true
    await post.save()
    res.json({ message: 'Post hidden from profile successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const toggleComments = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only toggle comments on your own posts' })
    }

    // Store comment state in a custom field or use visibility.except
    // For now, we'll use a workaround by storing in a metadata field
    const allowComments = (post as any).allowComments !== false
    ;(post as any).allowComments = !allowComments
    await post.save()
    res.json({ 
      message: `Comments ${!allowComments ? 'enabled' : 'disabled'}`,
      allowComments: !allowComments
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getUserPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = (req.user._id as any).toString()
    const targetUserId = userId || currentUserId

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const posts = await Post.find({
      author: targetUserId,
      isArchived: false,
      isHidden: false,
      isHiddenFromProfile: { $ne: true },
    })
      .populate('author', 'profile subscription')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50)

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getUserReels = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = (req.user._id as any).toString()
    const targetUserId = userId || currentUserId

    const reels = await Post.find({
      author: targetUserId,
      'content.type': 'reel',
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ reels })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getSavedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get posts that the user has saved
    const posts = await Post.find({
      'engagement.saves': req.user._id,
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTaggedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = (req.user._id as any).toString()
    const targetUserId = userId || currentUserId

    // Get posts where the user is mentioned/tagged
    const posts = await Post.find({
      'content.mentions': targetUserId,
      isArchived: false,
      isHidden: false,
    })
      .populate('author', 'profile subscription')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ posts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getPost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params

    const post = await Post.findById(postId)
      .populate('author', 'profile subscription')
      .lean()

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json({ post })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const { text, visibility } = req.body

    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Check if user owns the post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own posts' })
    }

    if (text !== undefined) {
      post.content.text = text
    }

    if (visibility) {
      post.visibility = {
        type: visibility.type || post.visibility.type,
        except: visibility.except || post.visibility.except || [],
      }
    }

    await post.save()
    await post.populate('author', 'profile subscription')

    res.json({ post })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}
