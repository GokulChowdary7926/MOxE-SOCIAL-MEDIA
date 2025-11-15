import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ModalState {
  isOpen: boolean
  type: string | null
  data: any
}

interface UISlice {
  loading: {
    [key: string]: boolean
  }
  modals: {
    [key: string]: ModalState
  }
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  bottomNavVisible: boolean
}

const initialState: UISlice = {
  loading: {},
  modals: {},
  theme: 'dark',
  sidebarOpen: false,
  bottomNavVisible: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload]
    },
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.modals[action.payload.type] = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null,
      }
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false
      }
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setBottomNavVisible: (state, action: PayloadAction<boolean>) => {
      state.bottomNavVisible = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
  },
})

export const {
  setLoading,
  clearLoading,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
  setBottomNavVisible,
  setTheme,
} = uiSlice.actions

export default uiSlice.reducer

