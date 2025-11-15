import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface ContentSettings {
  posts: {
    defaultVisibility: 'following' | 'all' | 'close_friends' | 'premium' | 'thick'
    allowComments: boolean
    allowLikes: boolean
    allowDownloads: boolean
    allowScreenshots: boolean
    allowShares: boolean
    autoSaveToArchive: boolean
    locationTagging: boolean
    hashtagSuggestions: boolean
  }
  reels: {
    defaultVisibility: 'following' | 'all' | 'close_friends' | 'premium' | 'thick'
    autoPlay: boolean
    soundEnabled: boolean
    allowComments: boolean
    allowDuet: boolean
    allowStitch: boolean
    allowDownloads: boolean
    maxDuration: number // seconds
    quality: 'auto' | 'high' | 'medium' | 'low'
  }
  stories: {
    defaultVisibility: 'following' | 'all' | 'close_friends' | 'premium' | 'thick'
    allowReplies: boolean
    allowReactions: boolean
    hideFrom: string[] // user IDs
    saveToArchive: boolean
    showInHighlights: boolean
    expirationHours: number // 24 default
    allowScreenshots: boolean
  }
  live: {
    defaultVisibility: 'following' | 'all' | 'close_friends' | 'premium' | 'thick'
    allowComments: boolean
    allowReactions: boolean
    allowShares: boolean
    saveRecording: boolean
    quality: 'auto' | 'high' | 'medium' | 'low'
    notifications: {
      whenGoingLive: boolean
      whenViewerJoins: boolean
      whenViewerLeaves: boolean
      whenReactionReceived: boolean
    }
    moderation: {
      autoBlockSpam: boolean
      requireApprovalForComments: boolean
      blockKeywords: string[]
    }
  }
}

export default function ContentSettings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'stories' | 'live'>('posts')
  const [settings, setSettings] = useState<ContentSettings>({
    posts: {
      defaultVisibility: 'all',
      allowComments: true,
      allowLikes: true,
      allowDownloads: true,
      allowScreenshots: true,
      allowShares: true,
      autoSaveToArchive: false,
      locationTagging: true,
      hashtagSuggestions: true,
    },
    reels: {
      defaultVisibility: 'all',
      autoPlay: true,
      soundEnabled: true,
      allowComments: true,
      allowDuet: false,
      allowStitch: false,
      allowDownloads: true,
      maxDuration: 60,
      quality: 'auto',
    },
    stories: {
      defaultVisibility: 'all',
      allowReplies: true,
      allowReactions: true,
      hideFrom: [],
      saveToArchive: true,
      showInHighlights: false,
      expirationHours: 24,
      allowScreenshots: false,
    },
    live: {
      defaultVisibility: 'all',
      allowComments: true,
      allowReactions: true,
      allowShares: true,
      saveRecording: false,
      quality: 'auto',
      notifications: {
        whenGoingLive: true,
        whenViewerJoins: false,
        whenViewerLeaves: false,
        whenReactionReceived: true,
      },
      moderation: {
        autoBlockSpam: true,
        requireApprovalForComments: false,
        blockKeywords: [],
      },
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings')
      if (response.data.contentSettings) {
        setSettings({
          posts: { ...settings.posts, ...response.data.contentSettings.posts },
          reels: { ...settings.reels, ...response.data.contentSettings.reels },
          stories: { ...settings.stories, ...response.data.contentSettings.stories },
          live: { ...settings.live, ...response.data.contentSettings.live },
        })
      }
    } catch (error) {
      console.error('Failed to load content settings:', error)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    try {
      await api.put('/settings', {
        contentSettings: settings,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = (category: keyof ContentSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  const updateNestedSetting = (
    category: keyof ContentSettings,
    nestedKey: string,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [nestedKey]: {
          ...(prev[category] as any)[nestedKey],
          [key]: value,
        },
      },
    }))
  }

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    label, 
    description 
  }: { 
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
    description?: string
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm">{label}</h3>
        {description && <p className="text-xs text-text-gray mt-1">{description}</p>}
      </div>
      <label className="relative inline-block w-12 h-6 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="opacity-0 w-0 h-0"
        />
        <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
          checked ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
        }`}></span>
      </label>
    </div>
  )

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
          <h1 className="text-xl font-bold text-white">Content Settings</h1>
          <p className="text-sm text-text-gray">Manage default settings for your content</p>
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

      {/* Tabs */}
      <div className="bg-medium-gray rounded-2xl p-1 flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'posts'
              ? 'bg-primary text-white'
              : 'text-text-gray hover:text-white'
          }`}
        >
          <i className="fas fa-image mr-2"></i>Posts
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'reels'
              ? 'bg-primary text-white'
              : 'text-text-gray hover:text-white'
          }`}
        >
          <i className="fas fa-video mr-2"></i>Reels
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'stories'
              ? 'bg-primary text-white'
              : 'text-text-gray hover:text-white'
          }`}
        >
          <i className="fas fa-circle-dot mr-2"></i>Stories
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors ${
            activeTab === 'live'
              ? 'bg-danger text-white'
              : 'text-text-gray hover:text-white'
          }`}
        >
          <i className="fas fa-broadcast-tower mr-2"></i>Live
        </button>
      </div>

      {/* Posts Settings */}
      {activeTab === 'posts' && (
        <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
          <div className="border-b border-light-gray pb-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-image text-primary-light"></i>
              Post Settings
            </h2>
            <p className="text-xs text-text-gray mt-1">Default settings for new posts</p>
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Default Visibility</label>
              <select
                value={settings.posts.defaultVisibility}
                onChange={(e) => updateSetting('posts', 'defaultVisibility', e.target.value)}
                className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
              >
                <option value="following">👥 Following</option>
                <option value="all">🌐 All</option>
                <option value="close_friends">⭐ Close Friends</option>
                <option value="premium">👑 Premium</option>
                <option value="thick">💎 Thick</option>
              </select>
          </div>

          {/* Engagement Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Engagement Options</h3>
            <ToggleSwitch
              checked={settings.posts.allowComments}
              onChange={(val) => updateSetting('posts', 'allowComments', val)}
              label="Allow Comments"
              description="Let others comment on your posts"
            />
            <ToggleSwitch
              checked={settings.posts.allowLikes}
              onChange={(val) => updateSetting('posts', 'allowLikes', val)}
              label="Allow Likes"
              description="Let others like your posts"
            />
            <ToggleSwitch
              checked={settings.posts.allowShares}
              onChange={(val) => updateSetting('posts', 'allowShares', val)}
              label="Allow Shares"
              description="Let others share your posts"
            />
            <ToggleSwitch
              checked={settings.posts.allowDownloads}
              onChange={(val) => updateSetting('posts', 'allowDownloads', val)}
              label="Allow Downloads"
              description="Let others download your media"
            />
            <ToggleSwitch
              checked={settings.posts.allowScreenshots}
              onChange={(val) => updateSetting('posts', 'allowScreenshots', val)}
              label="Allow Screenshots"
              description="Let others take screenshots (DSR protection)"
            />
          </div>

          {/* Additional Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Additional Options</h3>
            <ToggleSwitch
              checked={settings.posts.autoSaveToArchive}
              onChange={(val) => updateSetting('posts', 'autoSaveToArchive', val)}
              label="Auto-save to Archive"
              description="Automatically save all posts to your archive"
            />
            <ToggleSwitch
              checked={settings.posts.locationTagging}
              onChange={(val) => updateSetting('posts', 'locationTagging', val)}
              label="Location Tagging"
              description="Suggest location tags when creating posts"
            />
            <ToggleSwitch
              checked={settings.posts.hashtagSuggestions}
              onChange={(val) => updateSetting('posts', 'hashtagSuggestions', val)}
              label="Hashtag Suggestions"
              description="Show hashtag suggestions while typing"
            />
          </div>
        </div>
      )}

      {/* Reels Settings */}
      {activeTab === 'reels' && (
        <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
          <div className="border-b border-light-gray pb-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-video text-primary-light"></i>
              Reel Settings
            </h2>
            <p className="text-xs text-text-gray mt-1">Default settings for new reels</p>
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Default Visibility</label>
            <select
              value={settings.reels.defaultVisibility}
              onChange={(e) => updateSetting('reels', 'defaultVisibility', e.target.value)}
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
            >
              <option value="following">👥 Following</option>
              <option value="all">🌐 All</option>
              <option value="close_friends">⭐ Close Friends</option>
              <option value="premium">👑 Premium</option>
              <option value="thick">💎 Thick</option>
            </select>
          </div>

          {/* Playback Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Playback Options</h3>
            <ToggleSwitch
              checked={settings.reels.autoPlay}
              onChange={(val) => updateSetting('reels', 'autoPlay', val)}
              label="Auto-play Reels"
              description="Automatically play reels when scrolling"
            />
            <ToggleSwitch
              checked={settings.reels.soundEnabled}
              onChange={(val) => updateSetting('reels', 'soundEnabled', val)}
              label="Sound Enabled by Default"
              description="Reels play with sound by default"
            />
          </div>

          {/* Engagement Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Engagement Options</h3>
            <ToggleSwitch
              checked={settings.reels.allowComments}
              onChange={(val) => updateSetting('reels', 'allowComments', val)}
              label="Allow Comments"
              description="Let others comment on your reels"
            />
            <ToggleSwitch
              checked={settings.reels.allowDuet}
              onChange={(val) => updateSetting('reels', 'allowDuet', val)}
              label="Allow Duet"
              description="Let others create duets with your reels"
            />
            <ToggleSwitch
              checked={settings.reels.allowStitch}
              onChange={(val) => updateSetting('reels', 'allowStitch', val)}
              label="Allow Stitch"
              description="Let others stitch your reels"
            />
            <ToggleSwitch
              checked={settings.reels.allowDownloads}
              onChange={(val) => updateSetting('reels', 'allowDownloads', val)}
              label="Allow Downloads"
              description="Let others download your reels"
            />
          </div>

          {/* Quality & Duration */}
          <div className="space-y-4 border-t border-light-gray pt-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Max Duration (seconds)</label>
              <input
                type="number"
                min="15"
                max="300"
                value={settings.reels.maxDuration}
                onChange={(e) => updateSetting('reels', 'maxDuration', parseInt(e.target.value))}
                className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Video Quality</label>
              <select
                value={settings.reels.quality}
                onChange={(e) => updateSetting('reels', 'quality', e.target.value)}
                className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="high">High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality (Faster Upload)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stories Settings */}
      {activeTab === 'stories' && (
        <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
          <div className="border-b border-light-gray pb-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-circle-dot text-primary-light"></i>
              Story Settings
            </h2>
            <p className="text-xs text-text-gray mt-1">Default settings for new stories</p>
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Default Visibility</label>
            <select
              value={settings.stories.defaultVisibility}
              onChange={(e) => updateSetting('stories', 'defaultVisibility', e.target.value)}
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
            >
              <option value="following">👥 Following</option>
              <option value="all">🌐 All</option>
              <option value="close_friends">⭐ Close Friends</option>
              <option value="premium">👑 Premium</option>
              <option value="thick">💎 Thick</option>
            </select>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Expiration Time</label>
            <select
              value={settings.stories.expirationHours}
              onChange={(e) => updateSetting('stories', 'expirationHours', parseInt(e.target.value))}
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
            >
              <option value="1">1 Hour</option>
              <option value="6">6 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours (Default)</option>
              <option value="48">48 Hours</option>
            </select>
          </div>

          {/* Engagement Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Engagement Options</h3>
            <ToggleSwitch
              checked={settings.stories.allowReplies}
              onChange={(val) => updateSetting('stories', 'allowReplies', val)}
              label="Allow Replies"
              description="Let others reply to your stories"
            />
            <ToggleSwitch
              checked={settings.stories.allowReactions}
              onChange={(val) => updateSetting('stories', 'allowReactions', val)}
              label="Allow Reactions"
              description="Let others react to your stories"
            />
            <ToggleSwitch
              checked={settings.stories.allowScreenshots}
              onChange={(val) => updateSetting('stories', 'allowScreenshots', val)}
              label="Allow Screenshots"
              description="Let others take screenshots (DSR protection)"
            />
          </div>

          {/* Archive Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Archive Options</h3>
            <ToggleSwitch
              checked={settings.stories.saveToArchive}
              onChange={(val) => updateSetting('stories', 'saveToArchive', val)}
              label="Save to Archive"
              description="Automatically save stories to your archive"
            />
            <ToggleSwitch
              checked={settings.stories.showInHighlights}
              onChange={(val) => updateSetting('stories', 'showInHighlights', val)}
              label="Show in Highlights"
              description="Allow adding stories to highlights"
            />
          </div>
        </div>
      )}

      {/* Live Settings */}
      {activeTab === 'live' && (
        <div className="bg-medium-gray rounded-2xl p-4 space-y-4">
          <div className="border-b border-light-gray pb-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-broadcast-tower text-danger"></i>
              Live Stream Settings
            </h2>
            <p className="text-xs text-text-gray mt-1">Default settings for live streams</p>
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Default Visibility</label>
            <select
              value={settings.live.defaultVisibility}
              onChange={(e) => updateSetting('live', 'defaultVisibility', e.target.value)}
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
            >
              <option value="following">👥 Following</option>
              <option value="all">🌐 All</option>
              <option value="close_friends">⭐ Close Friends</option>
              <option value="premium">👑 Premium</option>
              <option value="thick">💎 Thick</option>
            </select>
          </div>

          {/* Engagement Options */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Engagement Options</h3>
            <ToggleSwitch
              checked={settings.live.allowComments}
              onChange={(val) => updateSetting('live', 'allowComments', val)}
              label="Allow Comments"
              description="Let viewers comment during live stream"
            />
            <ToggleSwitch
              checked={settings.live.allowReactions}
              onChange={(val) => updateSetting('live', 'allowReactions', val)}
              label="Allow Reactions"
              description="Let viewers react during live stream"
            />
            <ToggleSwitch
              checked={settings.live.allowShares}
              onChange={(val) => updateSetting('live', 'allowShares', val)}
              label="Allow Shares"
              description="Let viewers share your live stream"
            />
            <ToggleSwitch
              checked={settings.live.saveRecording}
              onChange={(val) => updateSetting('live', 'saveRecording', val)}
              label="Save Recording"
              description="Automatically save live stream recordings"
            />
          </div>

          {/* Notifications */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Notifications</h3>
            <ToggleSwitch
              checked={settings.live.notifications.whenGoingLive}
              onChange={(val) => updateNestedSetting('live', 'notifications', 'whenGoingLive', val)}
              label="Notify When Going Live"
              description="Send notifications when you start a live stream"
            />
            <ToggleSwitch
              checked={settings.live.notifications.whenViewerJoins}
              onChange={(val) => updateNestedSetting('live', 'notifications', 'whenViewerJoins', val)}
              label="Notify When Viewer Joins"
              description="Get notified when someone joins your stream"
            />
            <ToggleSwitch
              checked={settings.live.notifications.whenViewerLeaves}
              onChange={(val) => updateNestedSetting('live', 'notifications', 'whenViewerLeaves', val)}
              label="Notify When Viewer Leaves"
              description="Get notified when someone leaves your stream"
            />
            <ToggleSwitch
              checked={settings.live.notifications.whenReactionReceived}
              onChange={(val) => updateNestedSetting('live', 'notifications', 'whenReactionReceived', val)}
              label="Notify on Reactions"
              description="Get notified when viewers react to your stream"
            />
          </div>

          {/* Moderation */}
          <div className="space-y-1 border-t border-light-gray pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Moderation</h3>
            <ToggleSwitch
              checked={settings.live.moderation.autoBlockSpam}
              onChange={(val) => updateNestedSetting('live', 'moderation', 'autoBlockSpam', val)}
              label="Auto-block Spam"
              description="Automatically block spam comments"
            />
            <ToggleSwitch
              checked={settings.live.moderation.requireApprovalForComments}
              onChange={(val) => updateNestedSetting('live', 'moderation', 'requireApprovalForComments', val)}
              label="Require Comment Approval"
              description="Approve comments before they appear"
            />
          </div>

          {/* Quality */}
          <div className="border-t border-light-gray pt-4">
            <label className="block text-sm font-semibold text-white mb-2">Stream Quality</label>
            <select
              value={settings.live.quality}
              onChange={(e) => updateSetting('live', 'quality', e.target.value)}
              className="w-full bg-dark-gray border-none rounded-lg px-4 py-2.5 text-white text-sm"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="high">High Quality (1080p)</option>
              <option value="medium">Medium Quality (720p)</option>
              <option value="low">Low Quality (480p)</option>
            </select>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-4 bg-medium-gray rounded-2xl p-4 shadow-lg">
        <button
          onClick={saveSettings}
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <i className="fas fa-save"></i>
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

