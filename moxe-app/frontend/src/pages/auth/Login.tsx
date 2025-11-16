import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store'
import { requestOTP, setPhoneNumber } from '../../store/slices/authSlice'

export default function Login() {
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.trim()) {
      return
    }

    // Validate phone number (10-15 digits)
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10 || cleaned.length > 15) {
      alert('Please enter a valid phone number (10-15 digits)')
      return
    }

    try {
      const fullPhone = `${countryCode}${cleaned}`
      const result = await dispatch(requestOTP(fullPhone)).unwrap()
      dispatch(setPhoneNumber(fullPhone))
      
      // If OTP is returned (development mode), show it to user
      if (result.otp) {
        alert(`OTP Code: ${result.otp}\n\n(This is shown in development mode. In production, you'll receive it via SMS.)`)
      }
      
      navigate('/verify-otp')
    } catch (err: any) {
      console.error('Login error:', err)
      // Error is already handled by Redux slice and displayed in UI
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
          <h2 className="text-2xl font-semibold text-white mb-2">Welcome Back</h2>
          <p className="text-text-gray">Privacy-first social platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-medium-gray rounded-2xl p-6 space-y-4 shadow-lg shadow-black/20">
          {error && (
            <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-28 bg-light-gray border-none rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
              </select>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="flex-1 bg-light-gray border-none rounded-lg px-4 py-3 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                required
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
            <p className="text-xs text-text-gray mt-1">
              Sign in with phone + OTP. Up to 2 accounts per phone number.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending OTP...' : 'Continue'}
          </button>

          <p className="text-center text-sm text-text-gray">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary-light hover:underline"
            >
              Sign up
            </button>
          </p>
          <p className="text-center text-xs text-text-gray/70">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  )
}



