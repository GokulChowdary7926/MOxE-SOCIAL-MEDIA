import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moxe'
    
    // Connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    }
    
    await mongoose.connect(mongoURI, options)
    
    console.log('✅ MongoDB Connected:', mongoURI)
    console.log('📊 Database:', mongoose.connection.db?.databaseName)
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message)
    console.error('💡 Make sure MongoDB is running: brew services start mongodb-community')
    console.error('💡 Or start manually: mongod')
    // Don't exit in development - allow server to start and retry
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB connection closed through app termination')
  process.exit(0)
})

export default connectDB


