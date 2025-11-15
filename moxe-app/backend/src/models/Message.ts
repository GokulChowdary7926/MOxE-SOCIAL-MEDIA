import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
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
  translation?: {
    originalText: string
    translatedText: string
    targetLanguage: string
    isTranslated: boolean
  }
  status: {
    isRead: boolean
    readBy: mongoose.Types.ObjectId[]
    deliveredTo: mongoose.Types.ObjectId[]
  }
  settings: {
    isDisappearing: boolean
    disappearsAt?: Date
    isBlockedMessage: boolean
    isEdited: boolean
    editedAt?: Date
    isRecalled: boolean
    recalledAt?: Date
  }
  reactions: Array<{
    user: mongoose.Types.ObjectId
    emoji: string
    createdAt: Date
  }>
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>({
  conversation: { type: Schema.Types.ObjectId, required: true }, // Can be userId or conversationId
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: {
    type: { type: String, enum: ['text', 'image', 'video', 'voice', 'location'], required: true },
    text: String,
    media: {
      url: String,
      thumbnail: String,
      duration: Number,
    },
    location: {
      coordinates: [Number],
      name: String,
    },
  },
  translation: {
    originalText: String,
    translatedText: String,
    targetLanguage: String,
    isTranslated: { type: Boolean, default: false },
  },
  status: {
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  settings: {
    isDisappearing: { type: Boolean, default: false },
    disappearsAt: Date,
    isBlockedMessage: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isRecalled: { type: Boolean, default: false },
    recalledAt: Date,
  },
  reactions: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model<IMessage>('Message', MessageSchema)


