import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

interface ChatState {
  conversations: any[]
  currentConversation: any | null
  messages: any[]
  isLoading: boolean
  error: string | null
}

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,
}

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/chat/conversations')
      return response.data.conversations
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations')
    }
  }
)

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/messages/${userId}`)
      return { userId, messages: response.data.messages }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages')
    }
  }
)

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (data: { recipientId: string; text: string; translation?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/chat/send', data)
      return response.data.message
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message')
    }
  }
)

export const translateMessage = createAsyncThunk(
  'chat/translateMessage',
  async (data: { text: string; targetLanguage: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/chat/translate', data)
      return response.data.translation
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to translate message')
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<any>) => {
      state.messages.push(action.payload)
    },
    setCurrentConversation: (state, action: PayloadAction<any>) => {
      state.currentConversation = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false
        state.conversations = action.payload
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload)
      })
  },
})

export const { addMessage, setCurrentConversation, clearError } = chatSlice.actions
export default chatSlice.reducer
