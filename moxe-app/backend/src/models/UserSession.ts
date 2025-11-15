import mongoose, { Schema, Document } from 'mongoose'

export interface IUserSession extends Document {
  user: mongoose.Types.ObjectId
  device: string
  location: string
  ipAddress: string
  userAgent: string
  token: string
  lastActive: Date
  createdAt: Date
  expiresAt: Date
}

const UserSessionSchema = new Schema<IUserSession>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  device: { type: String, required: true },
  location: { type: String },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  token: { type: String, required: true },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
})

UserSessionSchema.index({ user: 1, lastActive: -1 })
UserSessionSchema.index({ token: 1 })
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model<IUserSession>('UserSession', UserSessionSchema)

