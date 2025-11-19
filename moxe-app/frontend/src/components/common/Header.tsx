import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import Logo from './Logo'

export default function Header() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [quietActive, setQuietActive] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const loadQuiet = async () => {
      try {
        const res = await fetch((import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/users/settings` : '/api/users/settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
          credentials: 'include',
        })
        const data = await res.json()
        const q = data?.notifications?.quietHours
        if (q?.enabled && q.start && q.end) {
          const now = new Date()
          const [sh, sm] = q.start.split(':').map((n: string) => parseInt(n, 10))
          const [eh, em] = q.end.split(':').map((n: string) => parseInt(n, 10))
          const start = new Date(now); start.setHours(sh, sm || 0, 0, 0)
          const end = new Date(now); end.setHours(eh, em || 0, 0, 0)
          const active = end <= start ? (now >= start || now <= end) : (now >= start && now <= end)
          setQuietActive(active)
        } else {
          setQuietActive(false)
        }
      } catch {
        setQuietActive(false)
      } finally {
        setChecked(true)
      }
    }
    loadQuiet()
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[rgba(0,0,0,0.5)] backdrop-blur-[20px] -webkit-backdrop-blur-[20px] px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
      <div className="max-w-md mx-auto flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Logo size="sm" showText={true} />
        </div>
        
        <div className="flex items-center gap-4">
            <button 
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => navigate('/create-post')}
              title="Create Post"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              className="text-white text-lg hover:text-accent transition-colors relative"
              onClick={() => navigate('/notifications')}
              title="Notifications"
            >
              <i className="fas fa-bell"></i>
              {checked && quietActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-warning rounded-full border-2 border-secondary" title="Quiet hours active"></span>
              )}
            </button>
            <button
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => navigate('/qr/scan')}
              title="Scan QR"
            >
              <i className="fas fa-qrcode"></i>
            </button>
            <button
              className="text-white text-lg hover:text-accent transition-colors"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
      </div>
    </header>
  )
}

