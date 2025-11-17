import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store'
import { createPassword } from '../../store/slices/authSlice'
import Logo from '../../components/common/Logo'

export default function CreatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      alert('Password is required')
      return
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    // Get registration data from localStorage
    const regDataStr = localStorage.getItem('registrationData')
    if (!regDataStr) {
      alert('Registration data not found. Please start over.')
      navigate('/register')
      return
    }

    const regData = JSON.parse(regDataStr)
    const phoneNumber = localStorage.getItem('phoneNumber') || regData.phone
    if (!phoneNumber) {
      alert('Phone number not found. Please start over.')
      navigate('/register')
      return
    }

    try {
      await dispatch(createPassword({
        phone: phoneNumber,
        password,
        username: regData.username,
        name: regData.name,
        email: regData.email,
        accountType: regData.accountType,
      })).unwrap()
      
      // Clear registration data
      localStorage.removeItem('registrationData')
      localStorage.removeItem('phoneNumber')
      localStorage.removeItem('devOtp')
      
      // Redirect to home
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error('Password creation error:', err)
      alert(`Failed to create account: ${err?.message || err}`)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Create Password</h2>
          <p className="text-text-gray">Set a secure password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-medium-gray rounded-2xl p-6 space-y-4 shadow-lg shadow-black/20">
          {error && (
            <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 8 characters)"
                className="w-full bg-light-gray border-none rounded-lg px-4 py-3 pr-10 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-gray hover:text-white"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <p className="text-xs text-text-gray mt-1">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-light-gray border-none rounded-lg px-4 py-3 pr-10 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-gray hover:text-white"
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full text-text-gray hover:text-white transition-colors text-sm"
          >
            Back to registration
          </button>
        </form>
      </div>
    </div>
  )
}

