import { Request, Response } from 'express'
import User from '../models/User'

const USERNAME_REGEX = /^(?=.{3,30}$)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]+$/
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'sex'] // extend with a DB/wordlist later
const RESERVED = [
  'admin','administrator','support','help','root','moxe','moxeofficial','system','official','meta'
]

export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.query as { username?: string }
    if (!username) return res.status(400).json({ available: false, message: 'Username required' })
    const uname = String(username).toLowerCase()
    if (!USERNAME_REGEX.test(uname)) {
      return res.json({ available: false, message: 'Invalid username format' })
    }
    if (BAD_WORDS.some((w) => uname.includes(w))) {
      return res.json({ available: false, message: 'Username contains prohibited words' })
    }
    if (RESERVED.includes(uname)) {
      return res.json({ available: false, message: 'Username is reserved' })
    }
    const exists = await User.findOne({
      $or: [{ username: uname }, { 'profile.username': uname }],
    }).lean()
    if (exists) {
      return res.json({ available: false, message: 'Username already taken' })
    }
    return res.json({ available: true, message: 'Username is available!' })
  } catch (e) {
    return res.status(500).json({ available: false, message: 'Server error' })
  }
}

export const suggestUsernames = async (req: Request, res: Response) => {
  const { base } = req.query as { base?: string }
  if (!base) return res.status(400).json({ suggestions: [] })
  const root = String(base).toLowerCase().replace(/[^a-z0-9]/g, '')
  const rand3 = () => Math.floor(Math.random() * 900 + 100)
  const suggestions = [
    `${root}_official`,
    `${root}.real`,
    `${root}123`,
    `${root}_01`,
    `${root}${rand3()}`,
    `${root}_${rand3()}`,
    `${root}.${rand3()}`,
  ]
  res.json({ suggestions })
}


