import { formatDistanceToNow, format } from 'date-fns'
import { DEFAULT_LOCALE, DEFAULT_CURRENCY } from './constants'

export const formatTimeAgo = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch {
    return 'recently'
  }
}

export const formatDate = (date: Date | string, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatStr)
  } catch {
    return ''
  }
}

export const formatCurrencyINR = (amount: number, currency: string = DEFAULT_CURRENCY, locale: string = DEFAULT_LOCALE): string => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `₹${amount}`
  }
}

export const formatNumberIN = (num: number, locale: string = DEFAULT_LOCALE): string => {
  try {
    return new Intl.NumberFormat(locale).format(num)
  } catch {
    return String(num)
  }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[\w]+/g
  return text.match(hashtagRegex) || []
}

export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@[\w]+/g
  return text.match(mentionRegex) || []
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  // India mobile validation: 10 digits starting with 6-9, optional +91 or 0 prefix
  const cleaned = phone.replace(/\s+/g, '')
  const regex = /^(?:\+91|0)?[6-9]\d{9}$/
  return regex.test(cleaned)
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const getInitials = (name: string): string => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const generateGradient = (seed: string): string => {
  // Generate consistent gradient based on string seed
  const colors = [
    'from-primary to-secondary',
    'from-secondary to-accent',
    'from-accent to-primary',
    'from-primary to-accent',
    'from-secondary to-primary',
  ]
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

