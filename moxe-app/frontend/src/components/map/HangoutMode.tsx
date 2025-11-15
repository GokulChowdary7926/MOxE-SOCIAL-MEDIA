import { useState, useRef } from 'react'

export default function HangoutMode() {
  const [isActive, setIsActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const toggleHangoutMode = async () => {
    const newState = !isActive
    setIsActive(newState)

    if (newState) {
      // Start voice detection
      startVoiceDetection()
    } else {
      stopVoiceDetection()
    }

    // TODO: Send to backend
    try {
      // await api.post('/location/hangout-mode', { active: newState })
    } catch (error) {
      console.error('Failed to toggle hangout mode:', error)
    }
  }

  const startVoiceDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser')
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current.abort()
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = false

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase()
      
      // Check for distress keywords
      const distressKeywords = ['help', 'emergency', 'sos', 'danger', 'dangerous']
      if (distressKeywords.some(keyword => transcript.includes(keyword))) {
        // Trigger SOS
        alert('Distress detected! Activating SOS...')
        // TODO: Trigger SOS activation
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      // Ignore "aborted" errors (happens when recognition is stopped intentionally)
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error)
      }
      setIsListening(false)
      
      // Only restart if error is not intentional and mode is still active
      if (isActive && event.error !== 'aborted' && event.error !== 'not-allowed') {
        setTimeout(() => {
          if (isActive) {
            startVoiceDetection()
          }
        }, 2000)
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      if (isActive) {
        // Restart if still active
        setTimeout(() => startVoiceDetection(), 1000)
      }
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start recognition:', error)
      setIsListening(false)
    }
  }

  const stopVoiceDetection = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current.abort()
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  return (
    <div
      className={`rounded-xl p-4 mb-4 flex items-center justify-between transition-all ${
        isActive
          ? 'bg-gradient-to-r from-success to-green-500 text-white'
          : 'bg-medium-gray'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isActive ? 'bg-white bg-opacity-20' : 'bg-light-gray'
          }`}
        >
          <i className="fas fa-users"></i>
        </div>
        <div>
          <div className="font-semibold">Hangout Mode {isActive ? 'Active' : ''}</div>
          {isActive && (
            <div className="text-xs opacity-90">
              {isListening ? 'Listening for distress sounds...' : 'SOS protection enabled'}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={toggleHangoutMode}
        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
          isActive
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
            : 'bg-primary hover:bg-primary-dark text-white'
        }`}
      >
        {isActive ? 'End Hangout' : 'Activate'}
      </button>
    </div>
  )
}

