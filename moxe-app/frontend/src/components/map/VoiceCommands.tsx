import { useState, useEffect, useRef } from 'react'

interface VoiceCommandsProps {
  onCommand: (command: string, params?: any) => void
}

export default function VoiceCommands({ onCommand }: VoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setTranscript(transcript)
      handleVoiceCommand(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim()

    // Navigation commands
    if (lowerCommand.includes('navigate to') || lowerCommand.includes('directions to')) {
      const destination = command.replace(/navigate to|directions to/gi, '').trim()
      onCommand('navigate', { destination })
    }
    // Search commands
    else if (lowerCommand.includes('search for') || lowerCommand.includes('find')) {
      const query = command.replace(/search for|find/gi, '').trim()
      onCommand('search', { query })
    }
    // Location commands
    else if (lowerCommand.includes('my location') || lowerCommand.includes('where am i')) {
      onCommand('myLocation')
    }
    // Traffic commands
    else if (lowerCommand.includes('show traffic') || lowerCommand.includes('traffic')) {
      onCommand('toggleTraffic', { enabled: true })
    }
    else if (lowerCommand.includes('hide traffic')) {
      onCommand('toggleTraffic', { enabled: false })
    }
    // Zoom commands
    else if (lowerCommand.includes('zoom in')) {
      onCommand('zoom', { direction: 'in' })
    }
    else if (lowerCommand.includes('zoom out')) {
      onCommand('zoom', { direction: 'out' })
    }
    // Save place
    else if (lowerCommand.includes('save this place') || lowerCommand.includes('save location')) {
      onCommand('savePlace')
    }
    // Default
    else {
      alert(`Command: "${command}"\n\nAvailable commands:\n- Navigate to [place]\n- Search for [query]\n- My location\n- Show traffic\n- Zoom in/out\n- Save this place`)
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start recognition:', error)
        alert('Voice recognition unavailable. Please check your microphone permissions.')
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all touch-manipulation ${
        isListening
          ? 'bg-danger animate-pulse'
          : 'bg-transparent active:bg-light-gray/20'
      }`}
      aria-label={isListening ? 'Stop listening' : 'Start voice command'}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <i className={`fas fa-${isListening ? 'stop' : 'microphone'} text-text-gray text-sm`}></i>
    </button>
  )
}

