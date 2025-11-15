import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-phone -emergencyContacts')
      .populate('followers', 'profile')
      .populate('following', 'profile')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { profile, privacy } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (profile) {
      if (profile.username) user.profile.username = profile.username
      if (profile.fullName) user.profile.fullName = profile.fullName
      if (profile.bio !== undefined) user.profile.bio = profile.bio
      if (profile.avatar) user.profile.avatar = profile.avatar
      if (profile.coverPhoto) user.profile.coverPhoto = profile.coverPhoto
      if (profile.website) user.profile.website = profile.website
      if (profile.isPrivate !== undefined) user.profile.isPrivate = profile.isPrivate
    }

    if (privacy) {
      if (privacy.invisibleMode !== undefined) user.privacy.invisibleMode = privacy.invisibleMode
      if (privacy.hideOnlineStatus !== undefined) user.privacy.hideOnlineStatus = privacy.hideOnlineStatus
      if (privacy.screenshotProtection !== undefined) user.privacy.screenshotProtection = privacy.screenshotProtection
      if (privacy.profileVisitTracking !== undefined) user.privacy.profileVisitTracking = privacy.profileVisitTracking
    }

    await user.save()

    res.json({ user })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUser = await User.findById(req.user._id)
    const targetUser = await User.findById(userId)

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const currentUserId = (currentUser._id as any).toString()
    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' })
    }

    const isFollowing = currentUser.following.some((id: any) => id.toString() === userId)
    
    if (isFollowing) {
      currentUser.following = currentUser.following.filter((id: any) => id.toString() !== userId)
      targetUser.followers = targetUser.followers.filter((id: any) => id.toString() !== currentUserId)
    } else {
      currentUser.following.push(userId as any)
      targetUser.followers.push(currentUser._id as any)
    }

    await currentUser.save()
    await targetUser.save()

    // Emit Socket.io event
    const io = req.app.get('io')
    if (io) {
      if (!isFollowing) {
        io.emit('user_followed', {
          targetUserId: userId,
          followerId: currentUser._id,
          followerName: currentUser.profile?.fullName,
        })
      } else {
        io.emit('user_unfollowed', {
          targetUserId: userId,
          followerId: currentUser._id,
        })
      }
    }

    res.json({ 
      following: currentUser.following,
      followers: targetUser.followers.length 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'profile subscription')
      .populate('following', 'profile subscription')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ 
      followers: user.followers,
      following: user.following 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const updateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!['basic', 'star', 'thick'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid subscription tier' })
    }

    user.subscription.tier = tier as 'basic' | 'star' | 'thick'
    user.subscription.startDate = new Date()
    
    // Set end date based on tier (monthly subscription)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)
    user.subscription.endDate = endDate

    await user.save()

    res.json({ subscription: user.subscription })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const addTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.trustedContacts.length >= 5) {
      return res.status(400).json({ message: 'Maximum 5 trusted contacts allowed' })
    }

    if (user.trustedContacts.includes(contactId as any)) {
      return res.status(400).json({ message: 'Contact already in trusted list' })
    }

    user.trustedContacts.push(contactId as any)
    await user.save()

    const contact = await User.findById(contactId).select('profile')
    
    res.json({ 
      trustedContacts: user.trustedContacts,
      contact 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const removeTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.trustedContacts = user.trustedContacts.filter(
      (id) => id.toString() !== contactId
    )
    await user.save()

    res.json({ trustedContacts: user.trustedContacts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrustedContacts = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('trustedContacts', 'profile location subscription')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ trustedContacts: user.trustedContacts })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUser = await User.findById(req.user._id)
    const targetUser = await User.findById(userId)

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const currentUserId = (currentUser._id as any).toString()
    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot unfollow yourself' })
    }

    const isFollowing = currentUser.following.some((id: any) => id.toString() === userId)
    
    if (!isFollowing) {
      return res.status(400).json({ message: 'You are not following this user' })
    }

    currentUser.following = currentUser.following.filter((id: any) => id.toString() !== userId)
    targetUser.followers = targetUser.followers.filter((id: any) => id.toString() !== currentUserId)

    await currentUser.save()
    await targetUser.save()

    // Emit Socket.io event
    const io = req.app.get('io')
    if (io) {
      io.emit('user_unfollowed', {
        targetUserId: userId,
        followerId: currentUser._id,
      })
    }

    res.json({ 
      message: 'User unfollowed successfully',
      following: currentUser.following,
      followers: targetUser.followers.length 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get users that:
    // 1. Are not the current user
    // 2. Are not already being followed
    // 3. Have mutual connections (optional - can be enhanced)
    const followingIds = user.following.map((id: any) => id.toString())
    const blockedIds = user.blocked?.map((id: any) => id.toString()) || []
    const excludedIds = [user._id.toString(), ...followingIds, ...blockedIds]

    // Get suggestions based on:
    // - Users followed by people you follow (mutual connections)
    // - Popular users (most followers)
    // - New users
    const suggestions = await User.find({
      _id: { $nin: excludedIds },
      'profile.isPrivate': false, // Only suggest public profiles
    })
      .select('profile subscription followers')
      .sort({ 'followers': -1, createdAt: -1 }) // Sort by popularity and recency
      .limit(20)
      .lean()

    // Format suggestions
    const formattedSuggestions = suggestions.map((suggestion: any) => ({
      _id: suggestion._id,
      username: suggestion.profile?.username,
      fullName: suggestion.profile?.fullName,
      avatar: suggestion.profile?.avatar,
      bio: suggestion.profile?.bio,
      isVerified: suggestion.profile?.isVerified,
      subscription: suggestion.subscription,
      followersCount: suggestion.followers?.length || 0,
    }))

    res.json({ suggestions: formattedSuggestions })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}
