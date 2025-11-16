import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { collectionsAPI } from '../services/api'

export default function CollectionDetail() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<any>(null)
  const [allCollections, setAllCollections] = useState<any[]>([])
  const [moveTargetId, setMoveTargetId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [total, setTotal] = useState(0)

  const loadCollection = async (reset: boolean = true) => {
    if (!collectionId) return
    setIsLoading(true)
    try {
      const res = await api.get(`/collections/${collectionId}?page=${reset ? 1 : page}&perPage=${perPage}`)
      if (reset) {
        setPosts(res.data.posts || [])
        setPage(1)
      } else {
        setPosts((prev) => [...prev, ...(res.data.posts || [])])
      }
      setTotal(res.data.total || 0)
      setCollection(res.data.collection)
      const list = await collectionsAPI.list().catch(() => ({ data: { collections: [] } }))
      setAllCollections((list.data.collections || []).filter((c: any) => c._id !== collectionId))
      setMoveTargetId('')
    } catch (e) {
      console.error('Failed to load collection:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCollection(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId])

  const removePost = async (postId: string) => {
    if (!collectionId) return
    try {
      await fetch((import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/collections/${collectionId}/remove/${postId}` : `/api/collections/${collectionId}/remove/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        credentials: 'include',
      })
      await loadCollection(true)
    } catch {
      alert('Failed to remove post')
    }
  }

  const movePost = async (postId: string) => {
    if (!moveTargetId) {
      alert('Select a target collection to move to')
      return
    }
    try {
      // Add to target then remove from current
      await fetch((import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/collections/${moveTargetId}/add/${postId}` : `/api/collections/${moveTargetId}/add/${postId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        credentials: 'include',
      })
      await removePost(postId)
    } catch {
      alert('Failed to move post')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-medium-gray hover:bg-light-gray flex items-center justify-center text-white transition-colors">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Collection</h1>
          <p className="text-sm text-text-gray">{collection?.name || 'Loading...'}</p>
        </div>
      </div>

      <div className="bg-medium-gray rounded-2xl p-4">
        {isLoading && posts.length === 0 ? (
          <div className="text-center text-text-gray py-8">
            <i className="fas fa-spinner fa-spin text-2xl"></i>
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-text-gray">Move to</label>
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="bg-dark-gray text-white text-sm px-2 py-1 rounded-lg"
              >
                <option value="">Select collection</option>
                {allCollections.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {posts.map((post: any) => (
                <div key={post._id} className="relative group bg-dark-gray aspect-square overflow-hidden rounded-lg">
                  <img
                    src={post.content?.media?.[0]?.url}
                    alt="Post"
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/post/${post._id}`)}
                  />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removePost(post._id)}
                      className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      title="Remove from collection"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    <button
                      onClick={() => movePost(post._id)}
                      className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      title="Move to selected"
                    >
                      <i className="fas fa-share"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {posts.length < total && (
              <div className="flex justify-center mt-4">
                <button
                  disabled={isLoading}
                  onClick={async () => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    setIsLoading(true)
                    try {
                      const res = await api.get(`/collections/${collectionId}?page=${nextPage}&perPage=${perPage}`)
                      setPosts((prev) => [...prev, ...(res.data.posts || [])])
                      setTotal(res.data.total || total)
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                  className="bg-dark-gray text-white px-4 py-2 rounded-lg hover:bg-light-gray transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-text-gray py-8">
            <i className="fas fa-folder-open text-4xl mb-4"></i>
            <p>No posts in this collection</p>
          </div>
        )}
      </div>
    </div>
  )
}


