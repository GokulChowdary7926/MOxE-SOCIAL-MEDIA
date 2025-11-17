import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import api from '../../services/api'

interface ReelMenuProps {
  reelId: string
  authorId: string
  onReelDeleted?: () => void
  onReelArchived?: () => void
  onReelHidden?: () => void
}

export default function ReelMenu({ reelId, authorId, onReelDeleted, onReelArchived, onReelHidden }: ReelMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const isOwnReel = user?._id === authorId

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      await api.delete(`/posts/${reelId}`)
      setIsOpen(false)
      onReelDeleted?.()
    } catch (error) {
      console.error('Failed to delete reel:', error)
      alert('Failed to delete reel. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async () => {
    setIsLoading(true)
    try {
      await api.post(`/posts/${reelId}/archive`)
      setIsOpen(false)
      onReelArchived?.()
    } catch (error) {
      console.error('Failed to archive reel:', error)
      alert('Failed to archive reel. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleHide = async () => {
    setIsLoading(true)
    try {
      await api.post(`/posts/${reelId}/hide`)
      setIsOpen(false)
      onReelHidden?.()
    } catch (error) {
      console.error('Failed to hide reel:', error)
      alert('Failed to hide reel. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReport = async () => {
    const reason = prompt('Please provide a reason for reporting this reel:')
    if (!reason) return

    setIsLoading(true)
    try {
      await api.post(`/posts/${reelId}/report`, { reason })
      setIsOpen(false)
      alert('Reel reported successfully. Thank you for keeping MOxE safe.')
    } catch (error) {
      console.error('Failed to report reel:', error)
      alert('Failed to report reel. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setIsOpen(false)
    navigate(`/edit-post/${reelId}`)
  }

  const handleCopyLink = async () => {
    const reelUrl = `${window.location.origin}/reel/${reelId}`
    try {
      await navigator.clipboard.writeText(reelUrl)
      setIsOpen(false)
      alert('Reel link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleUnfollow = async () => {
    if (!confirm(`Unfollow this user? You won't see their reels anymore.`)) {
      return
    }

    setIsLoading(true)
    try {
      await api.post(`/users/unfollow/${authorId}`)
      setIsOpen(false)
      alert('Unfollowed successfully')
    } catch (error) {
      console.error('Failed to unfollow:', error)
      alert('Failed to unfollow. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm(`Block this user? You won't see their reels or be able to message them.`)) {
      return
    }

    setIsLoading(true)
    try {
      await api.post(`/users/block/${authorId}`)
      setIsOpen(false)
      alert('User blocked successfully')
    } catch (error) {
      console.error('Failed to block user:', error)
      alert('Failed to block user. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.post(`/posts/${reelId}/save`)
      setIsOpen(false)
      alert('Reel saved successfully!')
    } catch (error) {
      console.error('Failed to save reel:', error)
      alert('Failed to save reel. Please try again.')
    }
  }

  const handleShareToFacebook = () => {
    const reelUrl = `${window.location.origin}/reel/${reelId}`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reelUrl)}`, '_blank')
    setIsOpen(false)
  }

  const handleRemoveFromGrid = async () => {
    try {
      await api.post(`/posts/${reelId}/hide-from-profile`)
      setIsOpen(false)
      alert('Reel removed from main grid')
    } catch (error) {
      console.error('Failed to remove from grid:', error)
      alert('Failed to remove from grid. Please try again.')
    }
  }

  const handlePinToGrid = async () => {
    try {
      await api.post(`/posts/${reelId}/pin`)
      setIsOpen(false)
      alert('Reel pinned to main grid')
    } catch (error) {
      console.error('Failed to pin reel:', error)
      alert('Failed to pin reel. Please try again.')
    }
  }

  const handleToggleComments = async () => {
    try {
      await api.post(`/posts/${reelId}/toggle-comments`)
      setIsOpen(false)
      alert('Commenting toggled')
    } catch (error) {
      console.error('Failed to toggle comments:', error)
      alert('Failed to toggle comments. Please try again.')
    }
  }

  const handleAdjustPreview = () => {
    setIsOpen(false)
    navigate(`/edit-post/${reelId}?adjust=true`)
  }

  const handlePartnershipLabel = () => {
    setIsOpen(false)
    alert('Partnership label feature coming soon!')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
        aria-label="More options"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        disabled={isLoading}
      >
        <i className="fas fa-ellipsis-v text-white text-lg"></i>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
            style={{ touchAction: 'manipulation' }}
          />
          
          {/* Menu - Bottom Sheet for Own Reel, Dropdown for Others */}
          {isOwnReel ? (
            // OWN REEL MENU - Bottom Sheet Style
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-medium-gray rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-light-gray/50 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="px-4 pb-4 border-b border-light-gray/20">
                <h3 className="text-white font-semibold text-base">Reels</h3>
                <p className="text-text-gray text-sm">{user?.profile?.username || user?.profile?.fullName}</p>
              </div>

              {/* Top Action Buttons */}
              <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3">
                <button
                  onClick={handleSave}
                  className="bg-dark-gray rounded-xl p-4 flex flex-col items-center gap-2 border border-light-gray/20 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="far fa-bookmark text-white text-xl"></i>
                  <span className="text-white text-sm font-medium">Save</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    alert('QR code feature coming soon!')
                  }}
                  className="bg-dark-gray rounded-xl p-4 flex flex-col items-center gap-2 border border-light-gray/20 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-qrcode text-white text-xl"></i>
                  <span className="text-white text-sm font-medium">QR code</span>
                </button>
              </div>

              {/* Menu Options List */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleShareToFacebook}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">f</span>
                  </div>
                  <span className="flex-1 text-left text-sm">Share to Facebook</span>
                  <i className="fas fa-chevron-right text-text-gray text-xs"></i>
                </button>

                <button
                  onClick={handleRemoveFromGrid}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-minus-circle text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Remove from main grid</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    alert('Unhide likes feature coming soon!')
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="far fa-heart text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Unhide likes</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    alert('Unhide share count feature coming soon!')
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="far fa-paper-plane text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Unhide share count</span>
                </button>

                <button
                  onClick={handleArchive}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  disabled={isLoading}
                >
                  <i className="fas fa-archive text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Archive</span>
                </button>

                <button
                  onClick={handleToggleComments}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="far fa-comment text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Turn On Commenting</span>
                </button>

                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-edit text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Edit</span>
                </button>

                <button
                  onClick={handleAdjustPreview}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-crop text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Adjust preview</span>
                </button>

                <button
                  onClick={handlePartnershipLabel}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-user-check text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Partnership label and ads</span>
                </button>

                <button
                  onClick={handlePinToGrid}
                  className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-light-gray/10 active:bg-light-gray/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <i className="fas fa-thumbtack text-white text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Pin to main grid</span>
                </button>

                <div className="border-t border-light-gray/20 my-2"></div>

                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 flex items-center gap-3 text-danger hover:bg-danger/10 active:bg-danger/20 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  disabled={isLoading}
                >
                  <i className="fas fa-trash text-danger text-lg w-8 flex-shrink-0"></i>
                  <span className="flex-1 text-left text-sm">Delete</span>
                </button>
              </div>
            </div>
          ) : (
            // OTHER USER'S REEL MENU - Dropdown Style
            <div className="absolute right-2 top-12 z-50 bg-medium-gray/95 backdrop-blur-sm rounded-xl shadow-2xl min-w-[200px] overflow-hidden border border-light-gray/20">
              <button
                onClick={handleHide}
                className="w-full px-4 py-3 text-left text-white hover:bg-light-gray/20 active:bg-light-gray/30 transition-colors flex items-center gap-3 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                disabled={isLoading}
              >
                <i className="fas fa-eye-slash text-primary-light text-lg w-5"></i>
                <span className="text-sm">Hide Reel</span>
              </button>
              <button
                onClick={handleUnfollow}
                className="w-full px-4 py-3 text-left text-white hover:bg-light-gray/20 active:bg-light-gray/30 transition-colors flex items-center gap-3 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                disabled={isLoading}
              >
                <i className="fas fa-user-minus text-primary-light text-lg w-5"></i>
                <span className="text-sm">Unfollow</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-3 text-left text-white hover:bg-light-gray/20 active:bg-light-gray/30 transition-colors flex items-center gap-3 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <i className="fas fa-link text-primary-light text-lg w-5"></i>
                <span className="text-sm">Copy Link</span>
              </button>
              <div className="border-t border-light-gray/20"></div>
              <button
                onClick={handleBlock}
                className="w-full px-4 py-3 text-left text-warning hover:bg-warning/20 active:bg-warning/30 transition-colors flex items-center gap-3 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                disabled={isLoading}
              >
                <i className="fas fa-ban text-warning text-lg w-5"></i>
                <span className="text-sm">Block User</span>
              </button>
              <button
                onClick={handleReport}
                className="w-full px-4 py-3 text-left text-danger hover:bg-danger/20 active:bg-danger/30 transition-colors flex items-center gap-3 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                disabled={isLoading}
              >
                <i className="fas fa-flag text-danger text-lg w-5"></i>
                <span className="text-sm">Report</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
