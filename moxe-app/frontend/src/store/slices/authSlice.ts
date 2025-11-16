import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  otpSent: boolean
  phoneNumber: string | null
}

interface User {
  _id: string
  phone: string
  accountType: 'personal' | 'business' | 'creator'
  profile: {
    username: string
    fullName: string
    bio?: string
    avatar?: string
  }
  subscription: {
    tier: 'basic' | 'star' | 'thick'
  }
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  otpSent: false,
  phoneNumber: null,
}

// Async thunks
export const requestOTP = createAsyncThunk(
  'auth/requestOTP',
  async (phone: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/request-otp', { phone })
      console.log('OTP Response:', response.data) // Debug log
      return response.data
    } catch (error: any) {
      console.error('OTP Request Error:', error) // Debug log
      console.error('Error Response:', error.response?.data) // Debug log
      // Only reject if it's a real error (not a successful response with error message)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return rejectWithValue(error.response?.data?.message || 'Failed to send OTP')
      }
      // For network errors or 500 errors, still reject
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to send OTP')
    }
  }
)

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phone, otp }: { phone: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp })
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Invalid OTP')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: { phone: string; otp: string; name: string; accountType: 'personal' | 'business' | 'creator' }, { rejectWithValue }) => {
    try {
      // Enforce phone-only registration payload
      const payload = {
        phone: data.phone,
        otp: data.otp,
        name: data.name,
        accountType: data.accountType,
      }
      const response = await api.post('/auth/register', payload)
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async (phone: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { phone })
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token')
      
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      localStorage.removeItem('token')
      return rejectWithValue('Token invalid')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
    },
    clearError: (state) => {
      state.error = null
    },
    setOTPSent: (state, action: PayloadAction<boolean>) => {
      state.otpSent = action.payload
    },
    setPhoneNumber: (state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Request OTP
      .addCase(requestOTP.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(requestOTP.fulfilled, (state) => {
        state.isLoading = false
        state.otpSent = true
      })
      .addCase(requestOTP.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Verify OTP (just verifies, doesn't authenticate)
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false
        // OTP verified successfully, but don't set authenticated yet
        // Authentication happens in login/register
        if (action.payload.token) {
          state.token = action.payload.token
          state.user = action.payload.user
          state.isAuthenticated = true
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
        console.log('✅ Registration successful, user authenticated:', action.payload.user)
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
        console.log('✅ Login successful, user authenticated:', action.payload.user)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Verify Token
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(verifyToken.rejected, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
  },
})

export const { logout, clearError, setOTPSent, setPhoneNumber } = authSlice.actions
export default authSlice.reducer



