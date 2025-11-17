import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch } from '../../store'
import { requestOTP, setPhoneNumber } from '../../store/slices/authSlice'
import Logo from '../../components/common/Logo'

export default function Register() {
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState<'personal' | 'business' | 'creator'>('personal')
  const [existingAccounts, setExistingAccounts] = useState<any[]>([])
  const [accountsRemaining, setAccountsRemaining] = useState<number | null>(null)
  // const [checkingAccounts, setCheckingAccounts] = useState(false) // Reserved for future account checking UI
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  // Check existing accounts when phone number changes
  useEffect(() => {
    const checkExistingAccounts = async () => {
      if (phone.length >= 10) {
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length >= 10) {
          // setCheckingAccounts(true) // Reserved for future account checking UI
          try {
            // Try to get existing accounts info (this would be a new endpoint)
            // For now, we'll check during registration
            // setCheckingAccounts(false) // Reserved for future account checking UI
          } catch (error) {
            // setCheckingAccounts(false) // Reserved for future account checking UI
          }
        }
      }
    }
    checkExistingAccounts()
  }, [phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.trim() || !username.trim() || !name.trim() || !email.trim()) {
      alert('Phone number, username, name, and email are required')
      return
    }

    // Validate username (3-30 chars, alphanumeric, dots, underscores)
    if (!/^(?=.{3,30}$)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]+$/.test(username)) {
      alert('Username must be 3-30 characters, alphanumeric with dots and underscores only. Cannot start or end with dot.')
      return
    }

    // Validate phone number
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10 || cleaned.length > 15) {
      alert('Please enter a valid phone number (10-15 digits)')
      return
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    try {
      const fullPhone = `${countryCode}${cleaned}`
      const result = await dispatch(requestOTP(fullPhone)).unwrap()
      dispatch(setPhoneNumber(fullPhone))
      
      // If OTP is returned (development mode), show it to user
      if (result.otp) {
        localStorage.setItem('devOtp', result.otp)
        alert(`OTP Code: ${result.otp}\n\n(This is shown in development mode. In production, you'll receive it via SMS.)`)
      }
      
      // Store registration data temporarily
      localStorage.setItem('registrationData', JSON.stringify({ username, name, email, accountType, phone: fullPhone }))
      localStorage.setItem('phoneNumber', fullPhone)
      navigate('/verify-otp')
    } catch (err: any) {
      console.error('Registration error:', err)
      // Check if error contains account limit info
      if (err?.existingAccounts) {
        setExistingAccounts(err.existingAccounts)
        setAccountsRemaining(err.accountsRemaining || 0)
      }
      // Error is already handled by Redux slice and displayed in UI
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Create Account</h2>
          <p className="text-text-gray">Join the privacy-first social platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-medium-gray rounded-2xl p-6 space-y-4 shadow-lg shadow-black/20">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username *
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
              placeholder="Enter username"
              className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={3}
              maxLength={30}
            />
            <p className="text-xs text-text-gray mt-1">
              3-30 characters, letters, numbers, dots, and underscores only
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone Number *
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
              You can create up to 2 accounts per phone number. After verification, you'll create a password.
            </p>
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-medium mb-2">
              Account Type *
            </label>
            <select
              id="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as any)}
              className="w-full bg-light-gray border-none rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="creator">Creator</option>
            </select>
            {accountsRemaining !== null && (
              <p className="text-xs text-text-gray mt-1">
                {accountsRemaining > 0 
                  ? `You can create ${accountsRemaining} more account(s) with this phone number.`
                  : 'You have reached the maximum of 2 accounts per phone number.'
                }
              </p>
            )}
            {existingAccounts.length > 0 && (
              <div className="mt-2 p-2 bg-light-gray rounded-lg">
                <p className="text-xs text-text-gray mb-1">Existing accounts:</p>
                {existingAccounts.map((acc: any, idx: number) => (
                  <div key={idx} className="text-xs text-white">
                    • {acc.accountType} - @{acc.username || 'N/A'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Continue
          </button>

          <p className="text-center text-sm text-text-gray">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary-light hover:underline"
            >
              Sign in
            </button>
          </p>
          <p className="text-center text-xs text-text-gray/70">
            By creating an account, you agree to our Terms & Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  )
}



