import mongoose from 'mongoose'

const collectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  coverImageURL: { type: String },
  postCount: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: true },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true })

export default mongoose.model('Collection', collectionSchema)


