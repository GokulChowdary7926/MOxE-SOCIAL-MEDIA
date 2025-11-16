import { Request, Response, NextFunction } from 'express'

type Rule = {
  required?: boolean
  regex?: RegExp
  minLength?: number
  maxLength?: number
  enum?: string[]
  message?: string
}

type Schema = Record<string, Rule>

const validateObject = (obj: any, schema: Schema) => {
  const errors: string[] = []
  for (const [key, rule] of Object.entries(schema)) {
    const value = obj?.[key]
    if (rule.required && (value === undefined || value === null || String(value).trim() === '')) {
      errors.push(`${key} is required`)
      continue
    }
    if (value === undefined || value === null) continue
    const str = String(value)
    if (rule.minLength !== undefined && str.length < rule.minLength) {
      errors.push(`${key} must be at least ${rule.minLength} characters`)
    }
    if (rule.maxLength !== undefined && str.length > rule.maxLength) {
      errors.push(`${key} must be at most ${rule.maxLength} characters`)
    }
    if (rule.regex && !rule.regex.test(str)) {
      errors.push(rule.message || `${key} is invalid`)
    }
    if (rule.enum && !rule.enum.includes(str)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`)
    }
  }
  return errors
}

export const validateBody = (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
  const errors = validateObject(req.body, schema)
  if (errors.length) return res.status(400).json({ message: errors[0], errors })
  next()
}

export const validateQuery = (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
  const errors = validateObject(req.query, schema)
  if (errors.length) return res.status(400).json({ message: errors[0], errors })
  next()
}


