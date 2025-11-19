import { useState, useEffect, useRef } from 'react'

export default function SafetyCheckIn() {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Format time display
  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0')
  }

  // Handle timer countdown
  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            handleTimerExpired()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, totalSeconds])

  // Update display time from total seconds
  useEffect(() => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    setHours(h)
    setMinutes(m)
    setSeconds(s)
  }, [totalSeconds])

  const handleTimerExpired = () => {
    // Timer expired - trigger safety check-in alert
    alert('Safety Check-in Timer Expired! Please confirm you are safe or contact emergency services.')
    // Could also trigger SOS or notify contacts here
  }

  const incrementHours = () => {
    const newHours = Math.min(hours + 1, 23)
    setHours(newHours)
    updateTotalSeconds(newHours, minutes)
  }

  const decrementHours = () => {
    const newHours = Math.max(hours - 1, 0)
    setHours(newHours)
    updateTotalSeconds(newHours, minutes)
  }

  const incrementMinutes = () => {
    const newMinutes = minutes >= 59 ? 0 : minutes + 1
    setMinutes(newMinutes)
    updateTotalSeconds(hours, newMinutes)
  }

  const decrementMinutes = () => {
    const newMinutes = minutes <= 0 ? 59 : minutes - 1
    setMinutes(newMinutes)
    updateTotalSeconds(hours, newMinutes)
  }

  const updateTotalSeconds = (h: number, m: number) => {
    const total = h * 3600 + m * 60
    setTotalSeconds(total)
  }

  const handlePreset = (presetMinutes: number) => {
    const h = Math.floor(presetMinutes / 60)
    const m = presetMinutes % 60
    setHours(h)
    setMinutes(m)
    setTotalSeconds(presetMinutes * 60)
  }

  const handleStart = () => {
    if (totalSeconds > 0) {
      setIsRunning(true)
    } else {
      alert('Please set a timer duration first')
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setTotalSeconds(0)
    setHours(0)
    setMinutes(0)
    setSeconds(0)
  }

  const displayHours = formatTime(hours)
  const displayMinutes = formatTime(minutes)
  const displaySeconds = formatTime(seconds)

  return (
    <div className="min-h-screen bg-dark-gray pb-20">
      {/* Header */}
      <div className="bg-medium-gray p-4 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <i className="fas fa-clock text-white text-xl"></i>
          <h1 className="text-xl font-bold text-white">Safety Check-in</h1>
        </div>
        <p className="text-sm text-text-gray text-center">
          Set a timer for when you expect to reach your destination safely (up to 24 hours)
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* Timer Display */}
        <div className="bg-medium-gray rounded-2xl p-8 text-center">
          <div className="text-6xl font-bold text-yellow-400 mb-4 font-mono">
            {displayHours} : {displayMinutes} : {displaySeconds}
          </div>
        </div>

        {/* Manual Time Input */}
        <div className="bg-medium-gray rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Hours Input */}
            <div>
              <label className="block text-sm font-medium text-text-gray mb-2">Hours</label>
              <div className="bg-dark-gray rounded-lg border border-yellow-400/30 flex items-center justify-between p-3">
                <span className="text-white text-xl font-semibold">{formatTime(hours)}</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={incrementHours}
                    disabled={isRunning || hours >= 23}
                    className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Increment hours"
                  >
                    <i className="fas fa-chevron-up text-xs"></i>
                  </button>
                  <button
                    onClick={decrementHours}
                    disabled={isRunning || hours <= 0}
                    className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Decrement hours"
                  >
                    <i className="fas fa-chevron-down text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Minutes Input */}
            <div>
              <label className="block text-sm font-medium text-text-gray mb-2">Minutes</label>
              <div className="bg-dark-gray rounded-lg border border-yellow-400/30 flex items-center justify-between p-3">
                <span className="text-white text-xl font-semibold">{formatTime(minutes)}</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={incrementMinutes}
                    disabled={isRunning}
                    className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Increment minutes"
                  >
                    <i className="fas fa-chevron-up text-xs"></i>
                  </button>
                  <button
                    onClick={decrementMinutes}
                    disabled={isRunning}
                    className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Decrement minutes"
                  >
                    <i className="fas fa-chevron-down text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="bg-medium-gray rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePreset(1)}
              disabled={isRunning}
              className="bg-dark-gray rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400/20"
            >
              <i className="fas fa-hourglass-half text-yellow-400 text-xl"></i>
              <span className="text-white text-sm font-semibold">01 min</span>
            </button>
            <button
              onClick={() => handlePreset(10)}
              disabled={isRunning}
              className="bg-dark-gray rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400/20"
            >
              <i className="fas fa-hourglass-half text-yellow-400 text-xl"></i>
              <span className="text-white text-sm font-semibold">10 min</span>
            </button>
            <button
              onClick={() => handlePreset(60)}
              disabled={isRunning}
              className="bg-dark-gray rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400/20"
            >
              <i className="fas fa-hourglass-half text-yellow-400 text-xl"></i>
              <span className="text-white text-sm font-semibold">1 hour</span>
            </button>
            <button
              onClick={() => handlePreset(1440)}
              disabled={isRunning}
              className="bg-dark-gray rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400/20"
            >
              <i className="fas fa-hourglass-half text-yellow-400 text-xl"></i>
              <span className="text-white text-sm font-semibold">24 hours</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-4">
          <button
            onClick={handleStart}
            disabled={isRunning || totalSeconds === 0}
            className="w-full bg-dark-gray rounded-lg p-4 flex items-center justify-center gap-3 border border-yellow-400 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-play text-yellow-400 text-lg"></i>
            <span className="text-white font-semibold">Start Timer</span>
          </button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="w-full bg-dark-gray rounded-lg p-4 flex items-center justify-center gap-3 border border-yellow-400 hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-stop text-yellow-400 text-lg"></i>
            <span className="text-white font-semibold">Stop Timer</span>
          </button>
        </div>
      </div>
    </div>
  )
}

