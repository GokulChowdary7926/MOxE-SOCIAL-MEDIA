import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [message, setMessage] = useState<string>('Point the camera at a MOXE profile QR')
  const navigate = useNavigate()

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        tick()
      } catch (err) {
        setMessage('Camera access denied. Please allow camera permissions.')
      }
    }
    start()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const parseAndFollow = async (text: string) => {
    try {
      // Expect either full profile URL or a bare userId
      let userId = ''
      try {
        const url = new URL(text)
        const m = url.pathname.match(/\/profile\/(.+)$/)
        if (m && m[1]) userId = m[1]
      } catch {
        // Not a URL, maybe just an ID
        userId = text
      }
      if (!userId) {
        setMessage('Invalid QR content')
        return
      }
      await api.post(`/users/follow/${userId}`)
      setMessage('Followed successfully!')
      setTimeout(() => navigate(`/profile/${userId}`), 800)
    } catch (err) {
      setMessage('Failed to follow user')
    }
  }

  const tick = async () => {
    if (!videoRef.current) return
    // Try BarcodeDetector if available
    const anyWindow: any = window as any
    if (anyWindow.BarcodeDetector) {
      try {
        const detector = new anyWindow.BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (!videoRef.current) return
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes && barcodes.length > 0) {
            parseAndFollow(barcodes[0].rawValue)
            return
          }
          requestAnimationFrame(scan)
        }
        requestAnimationFrame(scan)
        return
      } catch {
        // Fallback loop below
      }
    }
    // Fallback: show unsupported message
    setMessage('QR scanning not supported on this browser. Use a device with BarcodeDetector support.')
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-medium-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Scan QR</h1>
          <p className="text-sm text-text-gray">Follow users by scanning their QR</p>
        </div>
      </div>
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 border-2 border-primary/60 m-6 rounded-lg pointer-events-none"></div>
        </div>
        <div className="mt-3 text-sm text-text-gray">{message}</div>
      </div>
    </div>
  )
}


