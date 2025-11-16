import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable credentials for CORS
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Update token if provided in response
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api


// Subscription API helpers
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  getStatus: () => api.get('/subscription/status'),
  subscribe: (plan: 'star' | 'thick') => api.post('/subscription/subscribe', { plan }),
  cancel: () => api.post('/subscription/cancel'),
}

// Chat API helpers
export const chatAPI = {
  conversations: () => api.get('/chat/conversations'),
  messagesWith: (userId: string) => api.get(`/chat/messages/${userId}`),
  sendMessage: (payload: { recipientId: string; text: string; translation?: string }) =>
    api.post('/chat/send', payload),
  editMessage: (messageId: string, text: string) =>
    api.put(`/chat/message/${messageId}/edit`, { text }),
  recallMessage: (messageId: string) =>
    api.delete(`/chat/message/${messageId}/recall`),
  addReaction: (messageId: string, emoji: string) =>
    api.post(`/chat/message/${messageId}/reaction`, { emoji }),
  markRead: (messageId: string) =>
    api.post(`/chat/message/${messageId}/read`),
  // Groups
  createGroup: (name: string, participants: string[]) =>
    api.post('/chat/groups', { name, participants }),
  getGroups: () => api.get('/chat/groups'),
}

// Collections API helpers
export const collectionsAPI = {
  list: () => api.get('/collections'),
  create: (name: string, isPrivate: boolean = true) =>
    api.post('/collections', { name, isPrivate }),
  addPost: (collectionId: string, postId: string) =>
    api.post(`/collections/${collectionId}/add/${postId}`),
  removePost: (collectionId: string, postId: string) =>
    api.delete(`/collections/${collectionId}/remove/${postId}`),
}

// Username API helpers
export const usernameAPI = {
  check: (username: string) => api.get(`/username/check`, { params: { username } }),
  suggest: (base: string) => api.get(`/username/suggest`, { params: { base } }),
}


