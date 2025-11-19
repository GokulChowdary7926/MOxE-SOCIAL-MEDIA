import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'story' | 'live' | 'post' | 'share'
  from: mongoose.Types.ObjectId
  post?: mongoose.Types.ObjectId
  comment?: mongoose.Types.ObjectId
  message?: mongoose.Types.ObjectId
  story?: mongoose.Types.ObjectId
  text?: string
  isRead: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'mention', 'message', 'story', 'live', 'post', 'share'],
      required: true,
    },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    message: { type: Schema.Types.ObjectId, ref: 'Message' },
    story: { type: Schema.Types.ObjectId, ref: 'Story' },
    text: { type: String },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model<INotification>('Notification', NotificationSchema)

