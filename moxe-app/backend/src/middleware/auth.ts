import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User'

export interface AuthRequest extends Request {
  user?: any
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    
    // Try both userId and _id (for compatibility)
    const userId = decoded.userId || decoded._id || decoded.id
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token format' })
    }
    
    const user = await User.findById(userId).select('-__v')

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = user
    req.user._id = user._id // Ensure _id is set
    next()
  } catch (error: any) {
    console.error('Auth error:', error.message)
    res.status(401).json({ message: 'Invalid token' })
  }
}


