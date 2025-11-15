import { useState } from 'react'

interface VoiceCommandProps {
  onMessage?: (message: string) => void
}

export default function VoiceCommand({ onMessage }: VoiceCommandProps) {
  const [isActive, setIsActive] = useState(false)
  const [transcript, setTranscript] = useState('')

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsActive(true)
      setTranscript('Listening...')
    }

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1]
      setTranscript(current[0].transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsActive(false)
      setTranscript('')
    }

    recognition.onend = () => {
      setIsActive(false)
      if (transcript && transcript !== 'Listening...' && onMessage) {
        onMessage(transcript)
        setTranscript('')
      }
    }

    recognition.start()
  }

  const stopRecording = () => {
    setIsActive(false)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 mb-4 cursor-pointer transition-all ${
        isActive
          ? 'border-primary bg-primary bg-opacity-10'
          : 'border-light-gray hover:border-primary'
      }`}
      onClick={isActive ? stopRecording : startRecording}
    >
      <div className="flex items-center justify-center gap-3">
        <i className={`fas fa-microphone text-xl ${isActive ? 'text-primary animate-pulse' : 'text-text-gray'}`}></i>
        <span className={isActive ? 'text-primary font-semibold' : 'text-text-gray'}>
          {isActive ? transcript || 'Listening... Speak now' : 'Tap and speak to send a nearby message'}
        </span>
      </div>
    </div>
  )
}


