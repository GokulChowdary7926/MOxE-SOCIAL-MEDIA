import mongoose, { Schema, Document } from 'mongoose'

export interface IStory extends Document {
      author: mongoose.Types.ObjectId
      media: Array<{
        url: string
        type: 'image' | 'video'
        thumbnail?: string
        duration?: number // Max 30 seconds
      }>
      caption?: string
      mentions: mongoose.Types.ObjectId[] // Max 10 mentions
      hashtags: string[] // Max 15 hashtags
      views: mongoose.Types.ObjectId[]
      oneTimeView: boolean // Premium - disappears after one view
      viewCount: number // Track views for one-time view
      dsrProtected: boolean // Screenshot protection
      visibility: {
        type: 'public' | 'followers' | 'close_friends' | 'private'
        except: mongoose.Types.ObjectId[] // Exclude specific users
      }
      expiresAt: Date
      createdAt: Date
    }

    const StorySchema = new Schema<IStory>({
      author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      media: [{
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        thumbnail: String,
        duration: Number, // Max 30 seconds for stories
      }],
      caption: { type: String, maxlength: 2200 },
      mentions: [{ type: Schema.Types.ObjectId, ref: 'User', maxlength: 10 }],
      hashtags: [{ type: String, maxlength: 15 }],
      views: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      oneTimeView: { type: Boolean, default: false },
      viewCount: { type: Number, default: 0 },
      dsrProtected: { type: Boolean, default: false },
      visibility: {
        type: { type: String, enum: ['public', 'followers', 'close_friends', 'private'], default: 'public' },
        except: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
      expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
      createdAt: { type: Date, default: Date.now },
    })

// Auto-delete expired stories (run cleanup job)
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model<IStory>('Story', StorySchema)

