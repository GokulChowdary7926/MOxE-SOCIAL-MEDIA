import express from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { updateLocation, getNearbyUsers, sendNearbyMessage } from '../controllers/locationController'
import { 
  activateSOS, 
  cancelSOS, 
  addEmergencyContact, 
  getEmergencyContacts,
  detectDistressVoice,
  getSOSStatus,
} from '../controllers/sosController'
import User from '../models/User'

const router = express.Router()

router.post('/update', authenticate, updateLocation)
router.get('/nearby-users', authenticate, getNearbyUsers)
router.post('/nearby-message', authenticate, sendNearbyMessage)
router.get('/sos-status', authenticate, getSOSStatus)
router.post('/sos-activate', authenticate, activateSOS)
router.post('/sos-cancel', authenticate, cancelSOS)
router.post('/sos-voice-detect', authenticate, detectDistressVoice)
router.post('/emergency-contacts', authenticate, addEmergencyContact)
router.get('/emergency-contacts', authenticate, getEmergencyContacts)

// Places Library routes
router.get('/saved-places', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    res.json({ places: user.savedPlaces || [] })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/saved-places', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    if (!user.savedPlaces) {
      user.savedPlaces = []
    }
    
    const newPlace = {
      ...req.body,
      savedAt: new Date(),
    }
    
    user.savedPlaces.push(newPlace as any)
    
    await user.save()
    res.json({ message: 'Place saved successfully', place: user.savedPlaces[user.savedPlaces.length - 1] })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/saved-places/:placeId', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    if (!user.savedPlaces) {
      user.savedPlaces = []
    }
    
    user.savedPlaces = user.savedPlaces.filter(
      (place: any) => place._id?.toString() !== req.params.placeId
    ) as any
    
    await user.save()
    res.json({ message: 'Place deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router


