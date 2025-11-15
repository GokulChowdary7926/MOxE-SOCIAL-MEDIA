import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import api from '../../services/api'

export default function AccountSettings() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    loadAccountData()
  }, [])

  const loadAccountData = async () => {
    try {
      const response = await api.get('/users/profile')
      setFormData({
        email: response.data.profile?.email || '',
        phone: response.data.profile?.phone || user?.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Failed to load account data:', error)
    }
  }

  const handleUpdateEmail = async () => {
    if (!formData.email) {
      alert('Please enter an email address')
      return
    }

    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings', { email: formData.email })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to update email:', error)
      setSaveStatus('error')
      alert(error.response?.data?.message || 'Failed to update email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword) {
      alert('Please fill in all password fields')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.patch('/users/settings/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
      setSaveStatus('saved')
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to update password:', error)
      setSaveStatus('error')
      alert(error.response?.data?.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivateAccount = async () => {
    const confirm = window.confirm(
      'Are you sure you want to deactivate your account? You can reactivate it within 30 days by logging in again.'
    )
    if (!confirm) return

    try {
      await api.post('/users/deactivate')
      alert('Account deactivated successfully')
      // Redirect to login
      window.location.href = '/login'
    } catch (error: any) {
      console.error('Failed to deactivate account:', error)
      alert(error.response?.data?.message || 'Failed to deactivate account')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-full bg-medium-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-text-gray">Manage your account information</p>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="bg-success/20 border border-success rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-check-circle text-success"></i>
          <span className="text-success text-sm">Settings saved successfully!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-danger/20 border border-danger rounded-lg p-3 flex items-center gap-2">
          <i className="fas fa-exclamation-circle text-danger"></i>
          <span className="text-danger text-sm">Failed to save settings. Please try again.</span>
        </div>
      )}

      {/* Email Section */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Email Address</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleUpdateEmail}
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Email'}
          </button>
        </div>
      </div>

      {/* Phone Section */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Phone Number</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              readOnly
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray opacity-60"
            />
            <p className="text-xs text-text-gray mt-1">Phone number cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Change Password</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Current Password</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Enter current password"
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">New Password</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Enter new password"
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-gray mb-2">Confirm New Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-4 border border-danger/30">
        <h2 className="text-lg font-semibold text-danger">Danger Zone</h2>
        <div className="space-y-3">
          <p className="text-sm text-text-gray">
            Deactivating your account will hide your profile and content. You can reactivate within 30 days.
          </p>
          <button
            onClick={handleDeactivateAccount}
            className="w-full bg-danger/20 text-danger py-2.5 rounded-lg font-semibold hover:bg-danger/30 transition-colors border border-danger/50"
          >
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  )
}

