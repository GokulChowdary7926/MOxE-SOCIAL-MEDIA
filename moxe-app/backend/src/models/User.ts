import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  phone: string
  email?: string // Optional, for business/creator accounts
  accountType: 'personal' | 'business' | 'creator'
  accountsRemaining: number
  username?: string
  usernameChangeAllowedAt?: Date
  profile: {
    username?: string
    fullName?: string
    bio?: string // Max 150 characters
    dateOfBirth?: Date
    avatar?: string
    coverPhoto?: string
    website?: string
    isPrivate: boolean
    isVerified: boolean
    storyHighlights?: Array<{
      title: string
      coverImage: string
      stories: mongoose.Types.ObjectId[]
    }>
    // Business/Creator specific
    businessCategory?: string
    contactEmail?: string
    contactPhone?: string
    contactLocation?: string
    callToActionButtons?: Array<{
      label: string
      action: string
      url?: string
    }>
  }
  subscription: {
    tier: 'basic' | 'star' | 'thick'
    startDate?: Date
    endDate?: Date
    autoRenew: boolean
    periodStart?: Date // 28-day period tracking
    periodEnd?: Date
    blockedUsersMessaged?: Array<{
      userId: mongoose.Types.ObjectId
      messagesSent: number
      periodStart: Date
      periodEnd: Date
    }>
    anonymousProfilesViewed?: Array<{
      userId: mongoose.Types.ObjectId
      date: Date
    }>
    anonymousStoriesViewed?: Array<{
      userId: mongoose.Types.ObjectId
      date: Date
    }>
  }
  privacy: {
    invisibleMode: boolean
    hideOnlineStatus: boolean
    screenshotProtection: boolean
    profileVisitTracking: boolean
    profilePicturePrivacy: 'public' | 'followers' | 'close_friends' | 'private'
    bioPrivacy: 'public' | 'followers' | 'close_friends' | 'private'
    followerListPrivacy: 'public' | 'followers' | 'close_friends' | 'private'
    profileVisitors: mongoose.Types.ObjectId[] // Users who visited profile
  }
  location?: {
    latitude?: number
    longitude?: number
    lastUpdated?: Date
    isSharing?: boolean
    sharingRadius?: number
  }
  trustedContacts: mongoose.Types.ObjectId[] // Max 5 for proximity alerts
  emergencyContacts: Array<{
    name: string
    phone: string
    relationship: string
    isPrimary: boolean
  }>
  settings?: {
    nearbyMessaging?: {
      radius: number
      anonymousMode: boolean
    }
    sosProtection?: {
      enableVoiceDetection: boolean
      autoSendOnDistress: boolean
      backgroundMonitoring: boolean
    }
    proximityAlerts?: {
      enabled: boolean
    }
    translation?: {
      preferredLanguage: string
      autoTranslate: boolean
      showOriginal: boolean
    }
    notifications?: {
      pushNotifications: boolean
      emailNotifications: boolean
    }
    general?: {
      dataSharing: boolean
      adPersonalization: boolean
    }
    contentSettings?: {
      posts?: {
        defaultVisibility: 'public' | 'followers' | 'close_friends' | 'private' | 'only_me'
        allowComments: boolean
        allowLikes: boolean
        allowDownloads: boolean
        allowScreenshots: boolean
        allowShares: boolean
        autoSaveToArchive: boolean
        locationTagging: boolean
        hashtagSuggestions: boolean
      }
      reels?: {
        defaultVisibility: 'public' | 'followers' | 'close_friends' | 'private'
        autoPlay: boolean
        soundEnabled: boolean
        allowComments: boolean
        allowDuet: boolean
        allowStitch: boolean
        allowDownloads: boolean
        maxDuration: number
        quality: 'auto' | 'high' | 'medium' | 'low'
      }
      stories?: {
        defaultVisibility: 'public' | 'followers' | 'close_friends' | 'custom'
        allowReplies: boolean
        allowReactions: boolean
        hideFrom: mongoose.Types.ObjectId[]
        saveToArchive: boolean
        showInHighlights: boolean
        expirationHours: number
        allowScreenshots: boolean
      }
      live?: {
        defaultVisibility: 'public' | 'followers' | 'close_friends'
        allowComments: boolean
        allowReactions: boolean
        allowShares: boolean
        saveRecording: boolean
        quality: 'auto' | 'high' | 'medium' | 'low'
        notifications?: {
          whenGoingLive: boolean
          whenViewerJoins: boolean
          whenViewerLeaves: boolean
          whenReactionReceived: boolean
        }
        moderation?: {
          autoBlockSpam: boolean
          requireApprovalForComments: boolean
          blockKeywords: string[]
        }
      }
    }
  }
  lifestyleStreaks: {
    activity: string // e.g., 'gym', 'gaming', 'movies'
    currentStreak: number
    longestStreak: number
    lastActivity: Date
  }[]
  badges: string[] // Lifestyle and achievement badges
  followers: mongoose.Types.ObjectId[]
  savedPlaces: [{
    name: string
    address: string
    coordinates: {
      lat: number
      lng: number
    }
    type: 'place' | 'route' | 'guide'
    notes?: string
    category?: string
    rating?: number
    priceLevel?: number
    savedAt: Date
  }]
  following: mongoose.Types.ObjectId[]
  blockedUsers: mongoose.Types.ObjectId[]
  closeFriends: mongoose.Types.ObjectId[]
  hiddenPosts?: mongoose.Types.ObjectId[]
  password?: string
  deactivatedAt?: Date
  deviceTokens?: string[]
  createdAt: Date
  lastActive: Date
}

const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, index: true }, // Not unique - multiple accounts per phone allowed
  email: { type: String, sparse: true }, // Optional, for business/creator accounts
  accountType: { type: String, enum: ['personal', 'business', 'creator'], required: true },
  accountsRemaining: { type: Number, default: 1 },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    minlength: 3,
    maxlength: 30,
    match: /^(?=.{3,30}$)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]+$/,
  },
  usernameChangeAllowedAt: { type: Date, default: Date.now },
  profile: {
    username: { type: String, sparse: true, unique: true },
    fullName: String,
    bio: { type: String, maxlength: 150 },
    dateOfBirth: Date,
    avatar: String,
    coverPhoto: String,
    website: String,
    isPrivate: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    storyHighlights: [{
      title: String,
      coverImage: String,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }],
    }],
    businessCategory: String,
    contactEmail: String,
    contactPhone: String,
    contactLocation: String,
    callToActionButtons: [{
      label: String,
      action: String,
      url: String,
    }],
  },
  subscription: {
    tier: { type: String, enum: ['basic', 'star', 'thick'], default: 'basic' },
    startDate: Date,
    endDate: Date,
    autoRenew: { type: Boolean, default: false },
    periodStart: Date,
    periodEnd: Date,
    blockedUsersMessaged: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      messagesSent: { type: Number, default: 0 },
      periodStart: Date,
      periodEnd: Date,
    }],
    anonymousProfilesViewed: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      date: Date,
    }],
    anonymousStoriesViewed: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      date: Date,
    }],
  },
  privacy: {
    invisibleMode: { type: Boolean, default: false },
    hideOnlineStatus: { type: Boolean, default: false },
    screenshotProtection: { type: Boolean, default: false },
    profileVisitTracking: { type: Boolean, default: false },
    profilePicturePrivacy: { type: String, enum: ['public', 'followers', 'close_friends', 'private'], default: 'public' },
    bioPrivacy: { type: String, enum: ['public', 'followers', 'close_friends', 'private'], default: 'public' },
    followerListPrivacy: { type: String, enum: ['public', 'followers', 'close_friends', 'private'], default: 'public' },
    profileVisitors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  location: {
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    lastUpdated: { type: Date, required: false },
    isSharing: { type: Boolean, required: false },
    sharingRadius: { type: Number, required: false },
  },
  trustedContacts: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Max 5 enforced in controller
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String,
    isPrimary: Boolean,
  }],
  settings: {
    nearbyMessaging: {
      radius: { type: Number, default: 1000 },
      anonymousMode: { type: Boolean, default: false },
    },
    sosProtection: {
      enableVoiceDetection: { type: Boolean, default: false },
      autoSendOnDistress: { type: Boolean, default: false },
      backgroundMonitoring: { type: Boolean, default: false },
    },
    proximityAlerts: {
      enabled: { type: Boolean, default: false },
    },
    translation: {
      preferredLanguage: { type: String, default: 'auto' },
      autoTranslate: { type: Boolean, default: false },
      showOriginal: { type: Boolean, default: false },
    },
    notifications: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    general: {
      dataSharing: { type: Boolean, default: true },
      adPersonalization: { type: Boolean, default: false },
    },
    contentSettings: {
      posts: {
        defaultVisibility: { type: String, enum: ['public', 'followers', 'close_friends', 'private', 'only_me'], default: 'public' },
        allowComments: { type: Boolean, default: true },
        allowLikes: { type: Boolean, default: true },
        allowDownloads: { type: Boolean, default: true },
        allowScreenshots: { type: Boolean, default: true },
        allowShares: { type: Boolean, default: true },
        autoSaveToArchive: { type: Boolean, default: false },
        locationTagging: { type: Boolean, default: true },
        hashtagSuggestions: { type: Boolean, default: true },
      },
      reels: {
        defaultVisibility: { type: String, enum: ['public', 'followers', 'close_friends', 'private'], default: 'public' },
        autoPlay: { type: Boolean, default: true },
        soundEnabled: { type: Boolean, default: true },
        allowComments: { type: Boolean, default: true },
        allowDuet: { type: Boolean, default: false },
        allowStitch: { type: Boolean, default: false },
        allowDownloads: { type: Boolean, default: true },
        maxDuration: { type: Number, default: 60 },
        quality: { type: String, enum: ['auto', 'high', 'medium', 'low'], default: 'auto' },
      },
      stories: {
        defaultVisibility: { type: String, enum: ['public', 'followers', 'close_friends', 'custom'], default: 'public' },
        allowReplies: { type: Boolean, default: true },
        allowReactions: { type: Boolean, default: true },
        hideFrom: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        saveToArchive: { type: Boolean, default: true },
        showInHighlights: { type: Boolean, default: false },
        expirationHours: { type: Number, default: 24 },
        allowScreenshots: { type: Boolean, default: false },
      },
      live: {
        defaultVisibility: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' },
        allowComments: { type: Boolean, default: true },
        allowReactions: { type: Boolean, default: true },
        allowShares: { type: Boolean, default: true },
        saveRecording: { type: Boolean, default: false },
        quality: { type: String, enum: ['auto', 'high', 'medium', 'low'], default: 'auto' },
        notifications: {
          whenGoingLive: { type: Boolean, default: true },
          whenViewerJoins: { type: Boolean, default: false },
          whenViewerLeaves: { type: Boolean, default: false },
          whenReactionReceived: { type: Boolean, default: true },
        },
        moderation: {
          autoBlockSpam: { type: Boolean, default: true },
          requireApprovalForComments: { type: Boolean, default: false },
          blockKeywords: [String],
        },
      },
    },
  },
  lifestyleStreaks: [{
    activity: String,
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivity: Date,
  }],
  badges: [String],
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  closeFriends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  hiddenPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  password: { type: String },
  deactivatedAt: { type: Date },
  deviceTokens: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
})

// Compound index for phone + accountType to allow multiple accounts per phone
UserSchema.index({ phone: 1, accountType: 1 })

// Keep root username in sync with profile.username if one is present
UserSchema.pre('save', function(next) {
  // @ts-ignore
  const self = this as any
  if (!self.username && self.profile?.username) {
    self.username = String(self.profile.username).toLowerCase()
  }
  if (self.username && (!self.profile || !self.profile.username)) {
    self.profile = self.profile || {}
    self.profile.username = self.username
  }
  next()
})

export default mongoose.model<IUser>('User', UserSchema)

