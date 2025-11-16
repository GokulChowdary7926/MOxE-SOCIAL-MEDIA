import { useEffect } from 'react'

interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  userId: string
}

export default function QRModal({ isOpen, onClose, username, userId }: QRModalProps) {
  if (!isOpen) return null
  const profileUrl = `${window.location.origin}/profile/${userId}`
  const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(profileUrl)}&margin=2&size=300`

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-medium-gray rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-light-gray/20">
          <h2 className="text-white font-semibold">Profile QR</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-dark-gray text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-xl">
            <img src={qrSrc} alt="QR Code" className="w-56 h-56" />
          </div>
          <div className="text-white text-sm">@{username}</div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(profileUrl)
                alert('Profile link copied!')
              } catch {}
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Copy Profile Link
          </button>
        </div>
      </div>
    </div>
  )
}


