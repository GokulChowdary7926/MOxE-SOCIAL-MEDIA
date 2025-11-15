import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function DataExport() {
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'requested' | 'ready' | 'error'>('idle')

  const handleRequestData = async () => {
    setIsExporting(true)
    try {
      await api.post('/users/data-export/request')
      setExportStatus('requested')
      alert('Data export requested. You will receive an email when your data is ready for download.')
    } catch (error: any) {
      console.error('Failed to request data export:', error)
      setExportStatus('error')
      alert(error.response?.data?.message || 'Failed to request data export')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadData = async () => {
    try {
      const response = await api.get('/users/data-export/download', {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `moxe-data-${Date.now()}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Failed to download data:', error)
      alert('Failed to download data. Please request a new export.')
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
          <h1 className="text-xl font-bold text-white">Download Your Data</h1>
          <p className="text-sm text-text-gray">Get a copy of your MOXE data</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-medium-gray rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-primary text-xl mt-1"></i>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-2">What's included in your data export?</h3>
            <ul className="text-text-gray text-sm space-y-1 list-disc list-inside">
              <li>Profile information</li>
              <li>Posts, stories, and reels</li>
              <li>Messages and conversations</li>
              <li>Followers and following lists</li>
              <li>Saved posts and collections</li>
              <li>Settings and preferences</li>
              <li>Activity history</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Status */}
      {exportStatus === 'requested' && (
        <div className="bg-primary/20 border border-primary/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <i className="fas fa-clock text-primary text-xl"></i>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Export in progress</p>
              <p className="text-text-gray text-xs mt-1">
                We're preparing your data. You'll receive an email when it's ready (usually within 24 hours).
              </p>
            </div>
          </div>
        </div>
      )}

      {exportStatus === 'ready' && (
        <div className="bg-success/20 border border-success/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <i className="fas fa-check-circle text-success text-xl"></i>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Your data is ready</p>
              <p className="text-text-gray text-xs mt-1">
                Click the button below to download your data. The download link will expire in 7 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleRequestData}
          disabled={isExporting || exportStatus === 'requested'}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isExporting ? 'Requesting...' : exportStatus === 'requested' ? 'Export Requested' : 'Request Data Export'}
        </button>

        {exportStatus === 'ready' && (
          <button
            onClick={handleDownloadData}
            className="w-full bg-success text-white py-3 rounded-xl font-semibold hover:bg-success-dark transition-colors"
          >
            <i className="fas fa-download mr-2"></i>
            Download Your Data
          </button>
        )}
      </div>

      {/* Privacy Note */}
      <div className="bg-dark-gray rounded-lg p-3">
        <p className="text-text-gray text-xs">
          <i className="fas fa-shield-alt text-primary mr-2"></i>
          Your data is encrypted and will only be available for download for 7 days after generation.
        </p>
      </div>
    </div>
  )
}

