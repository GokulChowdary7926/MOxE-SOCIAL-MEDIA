import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import StoryViewer from './StoryViewer'

interface StoriesProps {
  stories: any[]
}

export default function Stories({ stories: _stories }: StoriesProps) {
  const navigate = useNavigate()
  const [storiesList, setStoriesList] = useState<any[]>([])
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null)
  const [viewingStories, setViewingStories] = useState<any[]>([])

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      const response = await api.get('/stories/feed')
      setStoriesList(response.data.stories || [])
    } catch (error) {
      console.error('Failed to load stories:', error)
      setStoriesList([])
    }
  }

  const allStories = [
    { _id: 'my-story', author: { profile: { fullName: 'Your Story', username: 'you' } }, isOwn: true },
    ...storiesList,
  ]

  const handleStoryClick = (story: any, index: number) => {
    if (story.isOwn) {
      navigate('/create-post?type=story')
    } else {
      // Filter out "Your Story" and set viewing stories
      const userStories = storiesList.filter(s => !s.isOwn)
      setViewingStories(userStories)
      setSelectedStoryIndex(index - 1) // Subtract 1 because we added "Your Story" at the beginning
    }
  }

  const handleCloseViewer = () => {
    setSelectedStoryIndex(null)
    setViewingStories([])
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-light-gray/10 bg-dark-gray overflow-x-auto">
        <div className="flex gap-4">
          {allStories.map((story, index) => (
            <div 
              key={story._id} 
              className="flex flex-col items-center min-w-[70px] cursor-pointer group"
              onClick={() => handleStoryClick(story, index)}
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-1 transition-transform group-active:scale-95 ${
                    story.isOwn
                      ? 'bg-light-gray border-2 border-dashed border-text-gray'
                      : 'bg-gradient-to-br from-primary via-accent to-secondary p-0.5'
                  }`}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${
                    story.isOwn ? 'bg-light-gray' : 'bg-dark-gray'
                  }`}>
                    {story.isOwn ? (
                      <i className="fas fa-plus text-text-gray text-lg"></i>
                    ) : (
                      story.author?.profile?.fullName?.charAt(0) || 'U'
                    )}
                  </div>
                </div>
                {!story.isOwn && story.hasUnseen && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-dark-gray"></div>
                )}
              </div>
              <span className="text-xs text-center max-w-[70px] truncate text-white">
                {story.isOwn ? 'Your Story' : story.author?.profile?.fullName || 'Story'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedStoryIndex !== null && viewingStories.length > 0 && (
        <StoryViewer
          stories={viewingStories}
          initialIndex={selectedStoryIndex}
          onClose={handleCloseViewer}
        />
      )}
    </>
  )
}
