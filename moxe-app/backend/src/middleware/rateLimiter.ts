import { Request, Response, NextFunction } from 'express'

type Bucket = { count: number; resetAt: number }
const store: Record<string, Bucket> = {}

// Simple in-memory rate limiter: max N per windowMs per key (ip+path)
export const rateLimiter =
  (max = 20, windowMs = 30_000) =>
  (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`
    const now = Date.now()
    const current = store[key]
    if (!current || current.resetAt < now) {
      store[key] = { count: 1, resetAt: now + windowMs }
      return next()
    }
    if (current.count >= max) {
      return res.status(429).json({ message: 'Too many attempts. Try again later.' })
    }
    current.count += 1
    return next()
  }


