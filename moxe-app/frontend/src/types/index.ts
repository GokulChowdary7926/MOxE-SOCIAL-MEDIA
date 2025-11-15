export interface User {
  _id: string
  phone: string
  email?: string
  accountType: 'personal' | 'business' | 'creator'
  profile: {
    username?: string
    fullName?: string
    bio?: string
    avatar?: string
    coverPhoto?: string
    website?: string
    dateOfBirth?: Date
    isPrivate?: boolean
    isVerified?: boolean
  }
  subscription: {
    tier: 'basic' | 'star' | 'thick'
    startDate?: Date
    endDate?: Date
    autoRenew?: boolean
  }
  followers?: string[]
  following?: string[]
  createdAt?: Date
}

export interface Post {
  _id: string
  author: User | string
  content: {
    type: 'post' | 'story' | 'reel' | 'live'
    text?: string
    media?: Array<{
      url: string
      type: 'image' | 'video'
      thumbnail?: string
      duration?: number
    }>
    hashtags?: string[]
    mentions?: string[]
  }
  visibility: {
    type: 'public' | 'followers' | 'close_friends' | 'private' | 'only_me' | 'following' | 'all' | 'premium' | 'thick'
    except?: string[]
  }
  engagement: {
    likes: string[]
    dislikes: string[]
    comments: number
    shares: number
    saves: string[]
  }
  createdAt: Date
  updatedAt?: Date
  isArchived?: boolean
  isHidden?: boolean
  isPinned?: boolean
  isHiddenFromProfile?: boolean
  contentType?: 'post' | 'story' | 'reel' | 'live'
}

export interface Message {
  _id: string
  conversation: string
  sender: User | string
  content: {
    type: 'text' | 'image' | 'video' | 'voice' | 'location'
    text?: string
    media?: {
      url: string
      thumbnail?: string
      duration?: number
    }
    location?: {
      coordinates: [number, number]
      name?: string
    }
  }
  status: {
    isRead: boolean
    readBy: string[]
    deliveredTo: string[]
  }
  reactions: Array<{
    user: string
    emoji: string
    createdAt: Date
  }>
  createdAt: Date
  settings?: {
    isEdited?: boolean
    editedAt?: Date
    isRecalled?: boolean
    recalledAt?: Date
  }
}

export interface Notification {
  _id: string
  user: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'story' | 'live'
  from: User | string
  post?: string
  message?: string
  isRead: boolean
  createdAt: Date
}

export interface Comment {
  _id: string
  post: string
  author: User | string
  text: string
  likes: string[]
  replies?: Comment[]
  createdAt: Date
}

