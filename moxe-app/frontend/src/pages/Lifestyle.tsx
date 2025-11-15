import { useState, useEffect } from 'react'
import api from '../services/api'

interface Streak {
  activity: string
  currentStreak: number
  longestStreak: number
  lastActivity: Date
}

interface Badge {
  name: string
  description: string
  icon: string
  earnedAt: Date
}

export default function Lifestyle() {
  // const { user } = useSelector((state: RootState) => state.auth) // Reserved for future use
  const [streaks, setStreaks] = useState<Streak[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [selectedActivity, setSelectedActivity] = useState('')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'streaks' | 'badges' | 'leaderboard'>('streaks')

  const activities = ['gym', 'gaming', 'movies', 'reading', 'cooking', 'travel', 'music', 'sports']

  useEffect(() => {
    fetchStreaks()
    fetchBadges()
  }, [])

  const fetchStreaks = async () => {
    try {
      const response = await api.get('/lifestyle/streaks')
      setStreaks(response.data.streaks || [])
    } catch (error) {
      console.error('Failed to fetch streaks:', error)
    }
  }

  const fetchBadges = async () => {
    try {
      // Mock badges for now
      setBadges([
        { name: 'Week Warrior', description: '7-day streak', icon: 'fa-fire', earnedAt: new Date() },
        { name: 'Month Master', description: '30-day streak', icon: 'fa-trophy', earnedAt: new Date() },
        { name: 'Century Club', description: '100-day streak', icon: 'fa-crown', earnedAt: new Date() },
      ])
    } catch (error) {
      console.error('Failed to fetch badges:', error)
    }
  }

  const updateStreak = async (activity: string) => {
    try {
      await api.post('/lifestyle/streak', { activity })
      fetchStreaks()
      fetchLeaderboard(activity)
    } catch (error) {
      console.error('Failed to update streak:', error)
      alert('Failed to update streak. Please try again.')
    }
  }

  const fetchLeaderboard = async (activity: string) => {
    try {
      const response = await api.get(`/lifestyle/leaderboard/${activity}`)
      setLeaderboard(response.data.leaderboard || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }

  const getStreakForActivity = (activity: string) => {
    return streaks.find((s) => s.activity === activity)
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-medium-gray rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-fire text-warning"></i>
          Lifestyle Streaks
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-light-gray">
          <button
            onClick={() => setActiveTab('streaks')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'streaks'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Streaks
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'badges'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Badges
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Leaderboard
          </button>
        </div>

        {/* Streaks Tab */}
        {activeTab === 'streaks' && (
          <div className="space-y-4">
            {activities.map((activity) => {
              const streak = getStreakForActivity(activity)
              return (
                <div
                  key={activity}
                  className="bg-light-gray rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl">
                      <i className={`fas fa-${activity === 'gym' ? 'dumbbell' : activity === 'gaming' ? 'gamepad' : activity === 'movies' ? 'film' : activity === 'reading' ? 'book' : activity === 'cooking' ? 'utensils' : activity === 'travel' ? 'plane' : activity === 'music' ? 'music' : 'futbol'}`}></i>
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize">{activity}</h3>
                      <p className="text-xs text-text-gray">
                        Current: {streak?.currentStreak || 0} days • Longest: {streak?.longestStreak || 0} days
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateStreak(activity)}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                  >
                    <i className="fas fa-fire mr-2"></i>
                    Update
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 gap-4">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-light-gray rounded-lg p-4 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-yellow-900 text-2xl mx-auto mb-2">
                  <i className={`fas ${badge.icon}`}></i>
                </div>
                <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                <p className="text-xs text-text-gray">{badge.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Activity</label>
              <select
                value={selectedActivity}
                onChange={(e) => {
                  setSelectedActivity(e.target.value)
                  if (e.target.value) {
                    fetchLeaderboard(e.target.value)
                  }
                }}
                className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white"
              >
                <option value="">Select an activity</option>
                {activities.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {selectedActivity && leaderboard.length > 0 && (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    className="bg-light-gray rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-900' : idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-light-gray text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{entry.username || 'User'}</h3>
                        <p className="text-xs text-text-gray">{entry.streak} day streak</p>
                      </div>
                    </div>
                    {idx < 3 && (
                      <i className={`fas ${idx === 0 ? 'fa-trophy text-yellow-400' : idx === 1 ? 'fa-medal text-gray-300' : 'fa-award text-orange-400'}`}></i>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

