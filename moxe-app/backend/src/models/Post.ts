import mongoose, { Schema, Document } from 'mongoose'

export interface IPost extends Document {
  author: mongoose.Types.ObjectId
  content: {
    type: 'post' | 'story' | 'reel'
    text?: string
    media?: Array<{
      url: string
      type: 'image' | 'video'
      thumbnail?: string
      duration?: number
      order: number
    }>
    dsrProtected: boolean
  }
  visibility: {
    type: 'public' | 'followers' | 'close_friends' | 'private' | 'only_me'
    except: mongoose.Types.ObjectId[]
  }
  isHidden: boolean
  isOneTimeView: boolean
  viewCount: number
  engagement: {
    likes: mongoose.Types.ObjectId[]
    dislikes: mongoose.Types.ObjectId[]
    comments: number | mongoose.Types.ObjectId[]
    shares: number
    saves: mongoose.Types.ObjectId[]
    views: number
  }
  metrics?: {
    engagementRate?: number
    reach?: number
    impressions?: number
    lastEngagedAt?: Date
  }
  algorithmScore?: number
  location?: {
    coordinates: [number, number]
    name?: string
    address?: string
  }
  hashtags: string[]
  mentions: mongoose.Types.ObjectId[]
  expiresAt?: Date
  isArchived: boolean
  isPinned?: boolean
  isHiddenFromProfile?: boolean
  reports?: Array<{
    reportedBy: mongoose.Types.ObjectId
    reason: string
    reportedAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      content: {
        type: { type: String, enum: ['post', 'story', 'reel', 'live'], required: true },
        text: String,
        media: [{
          url: String,
          type: { type: String, enum: ['image', 'video'] },
          thumbnail: String,
          duration: Number, // Max 45s for posts, 30s for stories, 60s for reels
          order: Number,
        }],
        dsrProtected: { type: Boolean, default: false }, // Digital Screening Rights - screenshot protection
        mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Max 10 mentions
        hashtags: [{ type: String, maxlength: 15 }], // Max 15 hashtags
        shoppingTags: [{ // For business accounts
          productId: String,
          productName: String,
          price: Number,
          url: String,
        }],
      },
      visibility: {
        type: { type: String, enum: ['public', 'followers', 'close_friends', 'private', 'only_me'], default: 'public' },
        except: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Exclude specific users
      },
      isHidden: { type: Boolean, default: false }, // Premium feature - hide without deleting
      isOneTimeView: { type: Boolean, default: false }, // Premium - story disappears after one view
      viewCount: { type: Number, default: 0 }, // For one-time view tracking
  engagement: {
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    shares: { type: Number, default: 0 },
    saves: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
  },
  location: {
    coordinates: [Number],
    name: String,
    address: String,
  },
  hashtags: [String],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: Date,
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isHiddenFromProfile: { type: Boolean, default: false },
  metrics: {
    engagementRate: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    lastEngagedAt: Date,
  },
  algorithmScore: { type: Number, default: 0.5, index: true },
  reports: [{
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    reportedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

PostSchema.index({ author: 1, createdAt: -1 })
PostSchema.index({ 'location.coordinates': '2dsphere' })
PostSchema.index({ createdAt: -1, algorithmScore: -1 })
PostSchema.index({ hashtags: 1, createdAt: -1 })
PostSchema.index({ 'engagement.likes': 1 })
PostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model<IPost>('Post', PostSchema)


