import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, isSharing, sharingRadius } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.location = {
      latitude,
      longitude,
      lastUpdated: new Date(),
      isSharing: isSharing !== undefined ? isSharing : user.location?.isSharing || false,
      sharingRadius: sharingRadius || user.location?.sharingRadius || 5000,
    }

    await user.save()

    // Emit Socket.io event for location update
    const io = req.app.get('io')
    if (io) {
      io.emit('location_updated', {
        userId: user._id,
        location: user.location,
      })
    }

    res.json({
      message: 'Location updated successfully',
      location: user.location,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}

export const getNearbyUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { radius = 5000 } = req.query // Default 5km
    const user = await User.findById(req.user._id)

    if (!user || !user.location?.latitude || !user.location?.longitude) {
      return res.json({ nearbyUsers: [] })
    }

    // Simple distance calculation (Haversine formula would be better for production)
    // For now, get all users with location sharing enabled
    const users = await User.find({
      'location.isSharing': true,
      _id: { $ne: user._id },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true },
    }).select('profile location subscription phone')

    // Calculate distances and filter by radius
    const userLocation = user.location as any
    const nearbyUsers = users
      .map((u: any) => {
        const uLocation = u.location as any
        if (!uLocation?.latitude || !uLocation?.longitude) return null

        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          uLocation.latitude,
          uLocation.longitude
        )

        if (distance <= Number(radius) / 1000) {
          return {
            _id: u._id,
            profile: u.profile,
            subscription: u.subscription,
            distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
            location: u.location,
          }
        }
        return null
      })
      .filter((u) => u !== null)

    res.json({ nearbyUsers })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const sendNearbyMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { message, radius, anonymous } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const userLocation = user.location as any
    if (!userLocation?.latitude || !userLocation?.longitude) {
      return res.status(400).json({ message: 'User location not available' })
    }

    // Get nearby users
    const nearbyUsers = await User.find({
      'location.isSharing': true,
      _id: { $ne: user._id },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true },
    })

    // Calculate distances and filter by radius
    const recipients = nearbyUsers
      .map((u: any) => {
        const uLocation = u.location as any
        if (!uLocation?.latitude || !uLocation?.longitude) return null

        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          uLocation.latitude,
          uLocation.longitude
        )

        if (distance <= Number(radius) / 1000) {
          return u._id.toString()
        }
        return null
      })
      .filter((id) => id !== null)

    // Emit Socket.io event to nearby users
    const io = req.app.get('io')
    if (io) {
      recipients.forEach((userId) => {
        io.to(`user:${userId}`).emit('nearby_message', {
          message,
          sender: anonymous ? 'Anonymous' : user.profile?.fullName,
          distance: radius,
        })
      })
    }

    res.json({
      message: 'Nearby message sent successfully',
      recipients: recipients.length,
      radius,
      anonymous,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}


