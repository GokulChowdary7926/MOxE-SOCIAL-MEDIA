import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

interface Post {
  _id: string
  author: {
    _id: string
    profile: {
      username: string
      fullName: string
      avatar?: string
    }
    subscription: {
      tier: string
    }
  }
  content: {
    text?: string
    media?: Array<{
      url: string
      type: 'image' | 'video'
      thumbnail?: string
    }>
  }
  engagement: {
    likes: string[]
    dislikes: string[]
    comments: number
    shares: number
  }
  createdAt: string
}

interface PostState {
  posts: Post[]
  stories: any[]
  isLoading: boolean
  error: string | null
  currentPost: Post | null
}

const initialState: PostState = {
  posts: [],
  stories: [],
  isLoading: false,
  error: null,
  currentPost: null,
}

export const fetchFeed = createAsyncThunk(
  'posts/fetchFeed',
  async (_, { rejectWithValue }) => {
    try {
      const [postsResponse, storiesResponse] = await Promise.all([
        api.get('/posts/feed'),
        api.get('/stories/feed').catch(() => ({ data: { stories: [] } })),
      ])
      return {
        posts: postsResponse.data.posts || [],
        stories: storiesResponse.data.stories || [],
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load feed')
    }
  }
)

export const likePost = createAsyncThunk(
  'posts/likePost',
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/posts/${postId}/like`)
      return { postId, data: response.data }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like post')
    }
  }
)

export const dislikePost = createAsyncThunk(
  'posts/dislikePost',
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/posts/${postId}/dislike`)
      return { postId, data: response.data }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dislike post')
    }
  }
)

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    addPost: (state, action: PayloadAction<Post>) => {
      // Check if post already exists to prevent duplicates
      const existingIndex = state.posts.findIndex(p => p._id === action.payload._id)
      if (existingIndex === -1) {
        // Post doesn't exist, add it to the beginning
        state.posts.unshift(action.payload)
      } else {
        // Post exists, update it instead
        state.posts[existingIndex] = action.payload
      }
    },
    updatePost: (state, action: PayloadAction<Post>) => {
      const index = state.posts.findIndex(p => p._id === action.payload._id)
      if (index !== -1) {
        state.posts[index] = action.payload
      }
    },
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(p => p._id !== action.payload)
    },
    clearPosts: (state) => {
      state.posts = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.isLoading = false
        // Remove duplicates by creating a Map with post IDs
        const postsMap = new Map<string, Post>()
        
        // Add existing posts to map
        state.posts.forEach(post => {
          postsMap.set(post._id, post)
        })
        
        // Add new posts from feed, replacing duplicates
        if (action.payload.posts && Array.isArray(action.payload.posts)) {
          action.payload.posts.forEach(post => {
            postsMap.set(post._id, post)
          })
        }
        
        // Convert map back to array and sort by createdAt (newest first)
        state.posts = Array.from(postsMap.values()).sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA
        })
        state.stories = action.payload.stories || []
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(likePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId)
        if (post) {
          post.engagement = action.payload.data.engagement
        }
      })
      .addCase(dislikePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId)
        if (post) {
          post.engagement = action.payload.data.engagement
        }
      })
  },
})

export const { addPost, updatePost, removePost, clearPosts } = postSlice.actions
export default postSlice.reducer


