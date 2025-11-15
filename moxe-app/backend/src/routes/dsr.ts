import express from 'express'
import { authenticate } from '../middleware/auth'
import { recordDSRViolation, toggleDSRProtection, getDSRViolations } from '../controllers/dsrController'

const router = express.Router()

router.post('/violation', authenticate, recordDSRViolation)
router.put('/toggle', authenticate, toggleDSRProtection)
router.get('/violations/:contentId', authenticate, getDSRViolations)

export default router


