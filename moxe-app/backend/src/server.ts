import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/database'
import setupSocketIO from './services/socketService'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  allowEIO3: true,
  pingTimeout: 120000,
  connectTimeout: 45000,
  upgradeTimeout: 10000,
})

// Make io available to routes
app.set('io', io)

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MOXE API is running' })
})

// Routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import postRoutes from './routes/posts'
import chatRoutes from './routes/chat'
import locationRoutes from './routes/location'
import storyRoutes from './routes/stories'
import searchRoutes from './routes/search'
import exploreRoutes from './routes/explore'
import settingsRoutes from './routes/settings'
import lifestyleRoutes from './routes/lifestyle'
import dsrRoutes from './routes/dsr'
import discoverRoutes from './routes/discover'
import notificationRoutes from './routes/notifications'
import storeRoutes from './routes/store'
import collectionRoutes from './routes/collections'
import subscriptionRoutes from './routes/subscription'
import usernameRoutes from './routes/username'

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/location', locationRoutes)
app.use('/api/stories', storyRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/explore', exploreRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/lifestyle', lifestyleRoutes)
app.use('/api/dsr', dsrRoutes)
app.use('/api/discover', discoverRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/store', storeRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/username', usernameRoutes)

// Setup Socket.io
setupSocketIO(io)

// Connect to database
connectDB()

// Start server
const PORT = process.env.PORT || 5001

httpServer.listen(PORT, () => {
  console.log(`🚀 MOXE Backend Server running on port ${PORT}`)
  console.log(`📡 Socket.io server ready`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

