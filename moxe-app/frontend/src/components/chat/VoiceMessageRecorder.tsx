import { useState, useRef, useEffect } from 'react'

interface VoiceMessageRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onCancel: () => void
}

export default function VoiceMessageRecorder({ onRecordingComplete, onCancel }: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Please allow microphone access to record voice messages')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <>
              <div className="w-12 h-12 rounded-full bg-danger flex items-center justify-center animate-pulse">
                <i className="fas fa-microphone text-white"></i>
              </div>
              <div>
                <p className="text-white font-semibold">Recording...</p>
                <p className="text-text-gray text-sm">{formatTime(recordingTime)}</p>
              </div>
            </>
          ) : audioBlob ? (
            <>
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <i className="fas fa-play text-white"></i>
              </div>
              <div>
                <p className="text-white font-semibold">Voice Message Ready</p>
                <p className="text-text-gray text-sm">{formatTime(recordingTime)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <i className="fas fa-microphone text-primary"></i>
              </div>
              <div>
                <p className="text-white font-semibold">Voice Message</p>
                <p className="text-text-gray text-sm">Tap to record</p>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-10 h-10 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger-dark transition-colors"
            >
              <i className="fas fa-stop"></i>
            </button>
          ) : audioBlob ? (
            <>
              <button
                onClick={() => {
                  setAudioBlob(null)
                  setRecordingTime(0)
                }}
                className="w-10 h-10 rounded-full bg-dark-gray text-white flex items-center justify-center hover:bg-light-gray/20 transition-colors"
              >
                <i className="fas fa-redo"></i>
              </button>
              <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
            >
              <i className="fas fa-microphone"></i>
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-dark-gray text-white flex items-center justify-center hover:bg-light-gray/20 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

