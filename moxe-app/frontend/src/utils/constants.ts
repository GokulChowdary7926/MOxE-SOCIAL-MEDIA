export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_TOTAL_SIZE = 40 * 1024 * 1024 // 40MB
export const MAX_VIDEO_DURATION = 60 // seconds
export const MAX_STORY_DURATION = 30 // seconds

export const POST_VISIBILITY_OPTIONS = [
  { value: 'following', label: '👥 Following', icon: 'fa-users' },
  { value: 'all', label: '🌐 All', icon: 'fa-globe' },
  { value: 'close_friends', label: '⭐ Close Friends', icon: 'fa-star' },
  { value: 'premium', label: '👑 Premium', icon: 'fa-crown' },
  { value: 'thick', label: '💎 Thick', icon: 'fa-gem' },
] as const

export const REACTION_TYPES = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
] as const

export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
  MESSAGE: 'message',
  STORY: 'story',
  LIVE: 'live',
} as const

