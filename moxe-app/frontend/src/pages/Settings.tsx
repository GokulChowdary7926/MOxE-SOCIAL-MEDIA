import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../store'
import { fetchProfile, updateSubscription } from '../store/slices/userSlice'
import api from '../services/api'

export default function Settings() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { profile } = useSelector((state: RootState) => state.user)
  const [activeTab, setActiveTab] = useState('privacy')
  const [query, setQuery] = useState('')
  const [privacySettings, setPrivacySettings] = useState({
    invisibleMode: false,
    hideOnlineStatus: false,
    screenshotProtection: false,
    profileVisitTracking: false,
    profilePicturePrivacy: 'public',
    bioPrivacy: 'public',
    followerListPrivacy: 'public',
  })
  const [profileVisibility, setProfileVisibility] = useState('public')
  const [dataSharing, setDataSharing] = useState(true)
  const [adPersonalization, setAdPersonalization] = useState(false)
  // Translation settings moved to dedicated TranslationSettings page
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
  })

  useEffect(() => {
    dispatch(fetchProfile())
    loadAllSettings()
  }, [dispatch])

  useEffect(() => {
    if (profile?.privacy) {
      setPrivacySettings({
        invisibleMode: profile.privacy.invisibleMode || false,
        hideOnlineStatus: profile.privacy.hideOnlineStatus || false,
        screenshotProtection: profile.privacy.screenshotProtection || false,
        profileVisitTracking: profile.privacy.profileVisitTracking || false,
        profilePicturePrivacy: profile.privacy.profilePicturePrivacy || 'public',
        bioPrivacy: profile.privacy.bioPrivacy || 'public',
        followerListPrivacy: profile.privacy.followerListPrivacy || 'public',
      })
    }
    if (profile?.profile?.isPrivate !== undefined) {
      setProfileVisibility(profile.profile.isPrivate ? 'private' : 'public')
    }
  }, [profile])

  const loadAllSettings = async () => {
    try {
      const response = await api.get('/settings')
      const settings = response.data
      
      // Translation settings are loaded in TranslationSettings page
      
      // Load notification settings
      if (settings.notifications) {
        setNotificationSettings({
          pushNotifications: settings.notifications.pushNotifications !== undefined 
            ? settings.notifications.pushNotifications 
            : true,
          emailNotifications: settings.notifications.emailNotifications !== undefined
            ? settings.notifications.emailNotifications
            : true,
        })
      }
      
      // Load general settings
      if (settings.general) {
        setDataSharing(settings.general.dataSharing !== undefined ? settings.general.dataSharing : true)
        setAdPersonalization(settings.general.adPersonalization !== undefined ? settings.general.adPersonalization : false)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // Translation settings are saved in the dedicated TranslationSettings page
  // This function is kept for potential future use but not currently called
  // const saveTranslationSettings = async () => {
  //   try {
  //     await api.put('/settings', {
  //       translation: translationSettings,
  //     })
  //     alert('Translation settings saved successfully!')
  //   } catch (error) {
  //     console.error('Failed to save translation settings:', error)
  //     alert('Failed to save translation settings. Please try again.')
  //   }
  // }

  const saveNotificationSettings = async (updates: any) => {
    try {
      await api.put('/settings', {
        notifications: updates,
      })
    } catch (error) {
      console.error('Failed to save notification settings:', error)
      alert('Failed to save notification settings. Please try again.')
    }
  }

  const handlePrivacyUpdate = async (key: string, value: any) => {
    const updated = { ...privacySettings, [key]: value }
    setPrivacySettings(updated)
    try {
      await api.put('/users/profile', {
        privacy: updated,
      })
      dispatch(fetchProfile())
    } catch (error) {
      console.error('Failed to update privacy settings:', error)
      alert('Failed to update settings. Please try again.')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Profile Header */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center text-white text-xl font-bold">
            {(profile?.profile?.fullName || user?.phone || 'U').toString().charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">{profile?.profile?.fullName || 'Your Account'}</div>
            <div className="text-text-gray text-sm truncate">
              {user?.phone || (profile as any)?.email || 'Set up your contact info'}
            </div>
          </div>
          <button
            onClick={() => navigate('/settings/account')}
            className="px-3 py-1.5 rounded-lg bg-dark-gray text-white text-sm hover:bg-light-gray/20 transition-colors"
          >
            Manage
          </button>
        </div>
        {/* Search */}
        <div className="mt-4">
          <div className="flex items-center gap-3 bg-dark-gray rounded-xl px-3 py-2">
            <i className="fas fa-search text-text-gray"></i>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings"
              className="flex-1 bg-transparent outline-none text-white placeholder-text-gray text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-medium-gray rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-cog text-primary-light"></i>
          Settings
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-light-gray overflow-x-auto">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'account'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Subscription
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'messages'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'content'
                ? 'border-primary text-primary-light'
                : 'border-transparent text-text-gray'
            }`}
          >
            Content
          </button>
        </div>

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-4">
            {/* Profile Visibility */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Profile Visibility</h3>
                <p className="text-xs text-text-gray">Who can see your profile</p>
              </div>
              <select
                value={profileVisibility}
                onChange={async (e) => {
                  const newValue = e.target.value
                  setProfileVisibility(newValue)
                  try {
                    await api.put('/users/profile', {
                      profile: { isPrivate: newValue === 'private' },
                    })
                    dispatch(fetchProfile())
                  } catch (error) {
                    console.error('Failed to update profile visibility:', error)
                    alert('Failed to update profile visibility')
                  }
                }}
                className="bg-light-gray border-none rounded-lg px-3 py-1 text-white text-sm"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Data Sharing */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Data Sharing</h3>
                <p className="text-xs text-text-gray">Control how your data is used</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={dataSharing}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    setDataSharing(newValue)
                    try {
                      await api.put('/settings', {
                        dataSharing: newValue,
                      })
                    } catch (error) {
                      console.error('Failed to update data sharing:', error)
                      alert('Failed to update data sharing setting')
                    }
                  }}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  dataSharing ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            {/* Ad Personalization */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ad Personalization</h3>
                <p className="text-xs text-text-gray">Personalized ads based on your interests</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={adPersonalization}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    setAdPersonalization(newValue)
                    try {
                      await api.put('/settings', {
                        adPersonalization: newValue,
                      })
                    } catch (error) {
                      console.error('Failed to update ad personalization:', error)
                      alert('Failed to update ad personalization setting')
                    }
                  }}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  adPersonalization ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="border-t border-light-gray pt-4 mt-4">
              <h3 className="font-semibold mb-3">Advanced Privacy</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Invisible Mode</h3>
                <p className="text-xs text-text-gray">Hide your online status from everyone</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={privacySettings.invisibleMode}
                  onChange={(e) => handlePrivacyUpdate('invisibleMode', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  privacySettings.invisibleMode ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Hide Online Status</h3>
                <p className="text-xs text-text-gray">Don't show when you're online</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={privacySettings.hideOnlineStatus}
                  onChange={(e) => handlePrivacyUpdate('hideOnlineStatus', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  privacySettings.hideOnlineStatus ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Screenshot Protection</h3>
                <p className="text-xs text-text-gray">Enable DSR protection for your content</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={privacySettings.screenshotProtection}
                  onChange={(e) => handlePrivacyUpdate('screenshotProtection', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  privacySettings.screenshotProtection ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Profile Visit Tracking</h3>
                <p className="text-xs text-text-gray">Track who visits your profile</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={privacySettings.profileVisitTracking}
                  onChange={(e) => handlePrivacyUpdate('profileVisitTracking', e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  privacySettings.profileVisitTracking ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="border-t border-light-gray pt-4 mt-4">
              <h3 className="font-semibold mb-3">Profile Picture Privacy</h3>
              <select
                value={privacySettings.profilePicturePrivacy}
                onChange={(e) => handlePrivacyUpdate('profilePicturePrivacy', e.target.value)}
                className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
                <option value="close_friends">Close Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="border-t border-light-gray pt-4">
              <h3 className="font-semibold mb-3">Bio Privacy</h3>
              <select
                value={privacySettings.bioPrivacy}
                onChange={(e) => handlePrivacyUpdate('bioPrivacy', e.target.value)}
                className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
                <option value="close_friends">Close Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="border-t border-light-gray pt-4">
              <h3 className="font-semibold mb-3">Follower List Privacy</h3>
              <select
                value={privacySettings.followerListPrivacy}
                onChange={(e) => handlePrivacyUpdate('followerListPrivacy', e.target.value)}
                className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
                <option value="close_friends">Close Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Type</h3>
              <p className="text-sm text-text-gray mb-4">
                {user?.accountType || profile?.accountType || 'Personal'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Phone Number</h3>
              <p className="text-sm text-text-gray mb-4">{user?.phone || 'N/A'}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-sm text-text-gray mb-4">{(user as any)?.email || (profile as any)?.email || 'Not set'}</p>
            </div>

            <div className="border-t border-light-gray pt-4">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // TODO: Implement account deletion
                    alert('Account deletion not yet implemented')
                  }
                }}
                className="w-full bg-danger text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Current Plan</h3>
                <p className="text-sm text-text-gray">Free Tier</p>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 px-3 py-1 rounded-full font-bold text-xs">
                {(user?.subscription?.tier || profile?.subscription?.tier || 'basic').toUpperCase()}
              </div>
            </div>

            {/* Star Tier */}
            <div className="border-2 border-light-gray rounded-xl p-4 mb-3 hover:border-primary transition-colors">
              <h3 className="text-primary font-semibold mb-2">Star Tier</h3>
              <div className="text-2xl font-bold mb-2">$1/month</div>
              <ul className="text-sm space-y-1 mb-3">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Ad-free experience</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Message blocked users (2/month)</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Anonymous profile viewing</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Voice command features</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Screenshot protection</span>
                </li>
              </ul>
              <button
                onClick={() => dispatch(updateSubscription('star'))}
                className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-crown mr-2"></i>Upgrade to Star Tier
              </button>
            </div>

            {/* Thick Tier */}
            <div className="border-2 border-light-gray rounded-xl p-4 hover:border-accent transition-colors">
              <h3 className="text-accent font-semibold mb-2">Thick Tier</h3>
              <div className="text-2xl font-bold mb-2">$5/month</div>
              <ul className="text-sm space-y-1 mb-3">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>All Star Tier features</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Business tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Cloud storage (10GB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Live translation</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>MOXE Map premium features</span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-success"></i>
                  <span>Proximity alerts</span>
                </li>
              </ul>
              <button
                onClick={() => dispatch(updateSubscription('thick'))}
                className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
              >
                <i className="fas fa-crown mr-2"></i>Upgrade to Thick Tier
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Push Notifications</h3>
                <p className="text-xs text-text-gray">Receive browser push notifications</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={notificationSettings.pushNotifications}
                  onChange={(e) => {
                    const newValue = e.target.checked
                    setNotificationSettings({ ...notificationSettings, pushNotifications: newValue })
                    saveNotificationSettings({ pushNotifications: newValue, emailNotifications: notificationSettings.emailNotifications })
                  }}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  notificationSettings.pushNotifications ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Email Notifications</h3>
                <p className="text-xs text-text-gray">Receive notifications via email</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => {
                    const newValue = e.target.checked
                    setNotificationSettings({ ...notificationSettings, emailNotifications: newValue })
                    saveNotificationSettings({ pushNotifications: notificationSettings.pushNotifications, emailNotifications: newValue })
                  }}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                  notificationSettings.emailNotifications ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
                }`}></span>
              </label>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="bg-dark-gray rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <i className="fas fa-comments text-primary-light"></i>
                Message Settings
              </h3>
              <p className="text-sm text-text-gray mb-4">
                Configure your messaging preferences.
              </p>
              <button
                onClick={() => navigate('/translation-settings')}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">AZ</span>
                </div>
                Translation Settings
              </button>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="bg-dark-gray rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <i className="fas fa-cog text-primary-light"></i>
                Content Settings
              </h3>
              <p className="text-sm text-text-gray mb-4">
                Manage default settings for posts, reels, stories, and live streams.
              </p>
              <button
                onClick={() => navigate('/settings/content')}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-sliders-h"></i>
                Open Content Settings
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Settings Section - grouped & searchable */}
        <div className="bg-medium-gray rounded-2xl p-4 space-y-6 mt-4">
          {/* Group 1: Account & Privacy */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Account & Privacy</h3>
            {[
              { label: 'Account Settings', icon: 'fa-user-cog', to: '/settings/account' },
              { label: 'Privacy Settings', icon: 'fa-shield-alt', to: '/settings/privacy' },
              { label: 'Blocked Users', icon: 'fa-user-slash', to: '/settings/blocked-users' },
            ]
              .filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
              .map((i) => (
                <button
                  key={i.label}
                  onClick={() => navigate(i.to)}
                  className="w-full flex items-center justify-between p-3 bg-dark-gray rounded-lg hover:bg-light-gray/20 transition-colors mb-2"
                >
                  <div className="flex items-center gap-3">
                    <i className={`fas ${i.icon} text-primary text-lg`}></i>
                    <span className="text-white font-medium">{i.label}</span>
                  </div>
                  <i className="fas fa-chevron-right text-text-gray"></i>
                </button>
              ))}
          </div>
          {/* Group 2: Security & Data */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Security & Data</h3>
            {[
              { label: 'Security Settings', icon: 'fa-lock', to: '/settings/security' },
              { label: 'Download Your Data', icon: 'fa-download', to: '/settings/data-export' },
              { label: 'Connected Apps', icon: 'fa-plug', to: '/settings/connected-apps' },
            ]
              .filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
              .map((i) => (
                <button
                  key={i.label}
                  onClick={() => navigate(i.to)}
                  className="w-full flex items-center justify-between p-3 bg-dark-gray rounded-lg hover:bg-light-gray/20 transition-colors mb-2"
                >
                  <div className="flex items-center gap-3">
                    <i className={`fas ${i.icon} text-primary text-lg`}></i>
                    <span className="text-white font-medium">{i.label}</span>
                  </div>
                  <i className="fas fa-chevron-right text-text-gray"></i>
                </button>
              ))}
          </div>
          {/* Group 3: App Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">App Preferences</h3>
            {[
              { label: 'Notification Settings', icon: 'fa-bell', to: '/settings/notifications' },
              { label: 'Accessibility', icon: 'fa-universal-access', to: '/settings/accessibility' },
              { label: 'Language & Region', icon: 'fa-globe', to: '/settings/language-region' },
            ]
              .filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
              .map((i) => (
                <button
                  key={i.label}
                  onClick={() => navigate(i.to)}
                  className="w-full flex items-center justify-between p-3 bg-dark-gray rounded-lg hover:bg-light-gray/20 transition-colors mb-2"
                >
                  <div className="flex items-center gap-3">
                    <i className={`fas ${i.icon} text-primary text-lg`}></i>
                    <span className="text-white font-medium">{i.label}</span>
                  </div>
                  <i className="fas fa-chevron-right text-text-gray"></i>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

