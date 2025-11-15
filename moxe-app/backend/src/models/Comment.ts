import mongoose, { Schema, Document } from 'mongoose'

export interface IComment extends Document {
  post: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  text: string
  likes: mongoose.Types.ObjectId[]
  replies: mongoose.Types.ObjectId[]
  parentComment?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.model<IComment>('Comment', CommentSchema)


