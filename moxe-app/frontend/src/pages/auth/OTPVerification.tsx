import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store'
import { verifyOTP, register, login, requestOTP } from '../../store/slices/authSlice'

export default function OTPVerification() {
  const [otp, setOtp] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [resending, setResending] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { phoneNumber, isLoading, error } = useSelector((state: RootState) => state.auth)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    // Check if we have registration data
    const regData = localStorage.getItem('registrationData')
    setIsRegistering(!!regData)
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const handleResend = async () => {
    if (secondsLeft > 0 || !phoneNumber) return
    try {
      setResending(true)
      await (dispatch as any)(requestOTP(phoneNumber)).unwrap()
      setSecondsLeft(30)
    } catch (e) {
      // noop; error flows through existing UI
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP')
      return
    }

    if (!phoneNumber) {
      navigate('/login')
      return
    }

    try {
      if (isRegistering) {
        // Registration flow
        const regData = JSON.parse(localStorage.getItem('registrationData') || '{}')
        await dispatch(register({
          phone: phoneNumber,
          otp,
          name: regData.name,
          accountType: regData.accountType,
        })).unwrap()
        localStorage.removeItem('registrationData')
        
        // Redirect after successful registration
        navigate('/', { replace: true })
      } else {
        // Login flow - first verify OTP, then login
        await dispatch(verifyOTP({ phone: phoneNumber, otp })).unwrap()
        await dispatch(login(phoneNumber)).unwrap()
        
        // Redirect after successful login
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      console.error('OTP verification error:', err)
      // Show user-friendly error message
      const errorMessage = err?.message || err || 'An error occurred. Please try again.'
      alert(`Registration/Login failed: ${errorMessage}`)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <i className="fas fa-shield-alt text-primary text-4xl bg-primary/20 p-3 rounded-full"></i>
            <span className="text-3xl font-bold text-white">MOXE</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Verify OTP</h2>
          <p className="text-text-gray">
            Enter the 6-digit code sent to<br />
            <span className="text-white font-medium">{phoneNumber}</span>
          </p>
          <p className="text-xs text-text-gray mt-2">
            Didn’t get a code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={secondsLeft > 0 || resending}
              className="text-primary-light disabled:opacity-50"
            >
              {resending ? 'Sending...' : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend now'}
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-medium-gray rounded-2xl p-6 space-y-4 shadow-lg shadow-black/20">
          {error && (
            <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="otp" className="block text-sm font-medium mb-2">
              OTP Code
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : isRegistering ? 'Create Account' : 'Verify & Login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-text-gray hover:text-white transition-colors text-sm"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  )
}



