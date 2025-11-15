import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function TranslationSettings() {
  const navigate = useNavigate()
  const [translationSettings, setTranslationSettings] = useState({
    preferredLanguage: 'auto',
    autoTranslate: false,
    showOriginal: false,
  })

  useEffect(() => {
    loadTranslationSettings()
  }, [])

  const loadTranslationSettings = async () => {
    try {
      const response = await api.get('/settings')
      if (response.data.translation) {
        setTranslationSettings({
          preferredLanguage: response.data.translation.preferredLanguage || 'auto',
          autoTranslate: response.data.translation.autoTranslate || false,
          showOriginal: response.data.translation.showOriginal || false,
        })
      }
    } catch (error) {
      console.error('Failed to load translation settings:', error)
    }
  }

  const saveTranslationSettings = async () => {
    try {
      await api.put('/settings', {
        translation: translationSettings,
      })
      alert('Translation settings saved successfully!')
    } catch (error) {
      console.error('Failed to save translation settings:', error)
      alert('Failed to save translation settings. Please try again.')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">AZ</span>
            </div>
            Translation Settings
          </h3>
          <button
            onClick={() => navigate('/settings')}
            className="text-text-gray hover:text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <p className="text-sm text-text-gray mb-4">
          Translate messages in real-time during conversations.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Preferred Language:</label>
            <select
              value={translationSettings.preferredLanguage}
              onChange={(e) => setTranslationSettings({ ...translationSettings, preferredLanguage: e.target.value })}
              className="w-full bg-light-gray border-none rounded-lg px-4 py-2 text-white"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-translate messages</span>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                className="opacity-0 w-0 h-0"
                checked={translationSettings.autoTranslate}
                onChange={(e) => setTranslationSettings({ ...translationSettings, autoTranslate: e.target.checked })}
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                translationSettings.autoTranslate ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Show original text</span>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                className="opacity-0 w-0 h-0"
                checked={translationSettings.showOriginal}
                onChange={(e) => setTranslationSettings({ ...translationSettings, showOriginal: e.target.checked })}
              />
              <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform ${
                translationSettings.showOriginal ? 'bg-primary before:translate-x-6' : 'bg-light-gray'
              }`}></span>
            </label>
          </div>

          <button
            onClick={saveTranslationSettings}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-save"></i>
            Save Translation Settings
          </button>
        </div>
      </div>
    </div>
  )
}

