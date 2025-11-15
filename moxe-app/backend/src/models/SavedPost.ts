import mongoose, { Schema, Document } from 'mongoose'

export interface ISavedPost extends Document {
  user: mongoose.Types.ObjectId
  post: mongoose.Types.ObjectId
  savedAt: Date
  collectionName?: string
}

const SavedPostSchema = new Schema<ISavedPost>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  savedAt: { type: Date, default: Date.now },
  collectionName: { type: String },
})

SavedPostSchema.index({ user: 1, post: 1 }, { unique: true })
SavedPostSchema.index({ user: 1, savedAt: -1 })

export default mongoose.model<ISavedPost>('SavedPost', SavedPostSchema)

