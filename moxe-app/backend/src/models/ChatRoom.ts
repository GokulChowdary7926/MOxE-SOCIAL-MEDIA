import mongoose, { Schema, Document } from 'mongoose'

export interface IChatRoom extends Document {
  name?: string
  type: 'direct' | 'group'
  participants: mongoose.Types.ObjectId[]
  admins?: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  avatar?: string
  description?: string
  isActive: boolean
  lastMessage?: mongoose.Types.ObjectId
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
}

const ChatRoomSchema = new Schema<IChatRoom>({
  name: { type: String },
  type: { type: String, enum: ['direct', 'group'], required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  avatar: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

ChatRoomSchema.index({ participants: 1, type: 1 })
ChatRoomSchema.index({ lastActivity: -1 })

export default mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema)

