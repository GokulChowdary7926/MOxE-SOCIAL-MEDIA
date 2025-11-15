import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

interface UserState {
  profile: any | null
  followers: any[]
  following: any[]
  trustedContacts: any[]
  isLoading: boolean
  error: string | null
}

const initialState: UserState = {
  profile: null,
  followers: [],
  following: [],
  trustedContacts: [],
  isLoading: false,
  error: null,
}

export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile')
      return response.data.user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData: any, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData)
      return response.data.user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile')
    }
  }
)

export const followUser = createAsyncThunk(
  'user/followUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/follow/${userId}`)
      return { userId, following: response.data.following }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to follow user')
    }
  }
)

export const fetchTrustedContacts = createAsyncThunk(
  'user/fetchTrustedContacts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/trusted-contacts')
      return response.data.trustedContacts
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch trusted contacts')
    }
  }
)

export const addTrustedContact = createAsyncThunk(
  'user/addTrustedContact',
  async (contactId: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/trusted-contacts', { contactId })
      return response.data.trustedContacts
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add trusted contact')
    }
  }
)

export const updateSubscription = createAsyncThunk(
  'user/updateSubscription',
  async (tier: 'basic' | 'star' | 'thick', { rejectWithValue }) => {
    try {
      const response = await api.put('/users/subscription', { tier })
      return response.data.subscription
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update subscription')
    }
  }
)

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.profile = action.payload
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload
      })
      .addCase(followUser.fulfilled, (state, action) => {
        // Update following list
        const isFollowing = state.following.some((id) => id === action.payload.userId)
        if (isFollowing) {
          state.following = state.following.filter((id) => id !== action.payload.userId)
        } else {
          state.following.push(action.payload.userId)
        }
      })
      .addCase(fetchTrustedContacts.fulfilled, (state, action) => {
        state.trustedContacts = action.payload
      })
      .addCase(addTrustedContact.fulfilled, (state, action) => {
        state.trustedContacts = action.payload
      })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.subscription = action.payload
        }
      })
  },
})

export const { clearError } = userSlice.actions
export default userSlice.reducer
