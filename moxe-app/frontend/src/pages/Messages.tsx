import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../store'
import { fetchConversations, fetchMessages, sendMessage, translateMessage } from '../store/slices/chatSlice'
import { useSocket } from '../hooks/useSocket'
import TypingIndicator from '../components/feed/TypingIndicator'
import { chatAPI } from '../services/api'

export default function Messages() {
  const dispatch = useDispatch<AppDispatch>()
  const { conversations, messages } = useSelector((state: RootState) => state.chat)
  const { user } = useSelector((state: RootState) => state.auth)
  // Translation settings moved to dedicated page - kept for message translation functionality only
  const [translationLanguage] = useState('auto')
  const [autoTranslate] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'followers' | 'following' | 'close_friends' | 'request' | 'blocked' | 'favorite'>('all')
  const messageInputRef = useRef<HTMLInputElement>(null)
  const { socket, isConnected } = useSocket()
  const [menuForMessage, setMenuForMessage] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<any | null>(null)

  useEffect(() => {
    dispatch(fetchConversations())
  }, [dispatch])

  // Real-time message and typing handlers
  useEffect(() => {
    if (!isConnected || !socket) return

    // Typing indicators
    socket.on('user_typing', (data: any) => {
      if (data.userId !== user?._id && data.conversationId === selectedUserId) {
        setTypingUser(data.username || data.fullName)
        setIsTyping(true)
      }
    })

    socket.on('user_stopped_typing', (data: any) => {
      if (data.conversationId === selectedUserId) {
        setIsTyping(false)
        setTypingUser(null)
      }
    })

    // New messages
    socket.on('new_message', (data: any) => {
      if (data.conversationId === selectedUserId || data.message?.sender?._id === selectedUserId) {
        dispatch(fetchMessages(selectedUserId || ''))
      }
      dispatch(fetchConversations()) // Update conversation list
    })

    // Message read receipts
    socket.on('message_read_receipt', (data: any) => {
      // Update message read status in UI
      console.log('✅ Message read:', data)
    })

    // Message edited
    socket.on('message_edited', (data: any) => {
      if (data.conversationId === selectedUserId) {
        dispatch(fetchMessages(selectedUserId || ''))
      }
    })

    // Message recalled
    socket.on('message_recalled', (data: any) => {
      if (data.conversationId === selectedUserId) {
        dispatch(fetchMessages(selectedUserId || ''))
      }
    })

    // Message reactions
    socket.on('message_reaction_received', (data: any) => {
      if (data.conversationId === selectedUserId) {
        dispatch(fetchMessages(selectedUserId || ''))
      }
    })

    return () => {
      socket.off('user_typing')
      socket.off('user_stopped_typing')
      socket.off('new_message')
      socket.off('message_read_receipt')
      socket.off('message_edited')
      socket.off('message_recalled')
      socket.off('message_reaction_received')
    }
  }, [isConnected, socket, selectedUserId, user, dispatch])

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (!selectedUserId || !messages?.length) return
    const unread = messages.filter((m: any) => (m.sender?._id || m.sender) !== user?._id && !(m.status?.isRead))
    unread.slice(-5).forEach((m: any) => {
      chatAPI.markRead(m._id).catch(() => {})
    })
  }, [messages, selectedUserId, user])

  const handleTyping = () => {
    if (!socket || !selectedUserId) return

    socket.emit('typing_start', {
      conversationId: selectedUserId,
      recipientId: selectedUserId,
    })

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      socket.emit('typing_stop', {
        conversationId: selectedUserId,
        recipientId: selectedUserId,
      })
    }, 3000)

    setTypingTimeout(timeout)
  }

  const handleSendMessage = async () => {
    if (!selectedUserId || !messageInputRef.current?.value.trim()) return
    
    const text = messageInputRef.current.value
    messageInputRef.current.value = ''
    if (isEditing && menuForMessage) {
      await chatAPI.editMessage(menuForMessage._id, text).catch(() => {})
      setIsEditing(false)
      setMenuForMessage(null)
      dispatch(fetchMessages(selectedUserId))
      return
    }
    await dispatch(sendMessage({
      recipientId: selectedUserId,
      text,
    }))
  }

  const openMenu = (msg: any) => {
    setMenuForMessage(msg)
    setIsEditing(false)
    setEditText(msg.content?.text || msg.text || '')
  }

  const handleRecall = async () => {
    if (!menuForMessage) return
    await chatAPI.recallMessage(menuForMessage._id).catch(() => {})
    setMenuForMessage(null)
    if (selectedUserId) dispatch(fetchMessages(selectedUserId))
  }

  const handleEdit = () => {
    if (!menuForMessage) return
    setIsEditing(true)
    if (messageInputRef.current) {
      messageInputRef.current.value = editText
      messageInputRef.current.focus()
    }
  }

  const handleReact = async (emoji: string) => {
    if (!menuForMessage) return
    await chatAPI.addReaction(menuForMessage._id, emoji).catch(() => {})
    setMenuForMessage(null)
    if (selectedUserId) dispatch(fetchMessages(selectedUserId))
  }

  const handleReply = () => {
    if (!menuForMessage) return
    setReplyTo(menuForMessage)
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
    setMenuForMessage(null)
  }

  // Filter conversations based on active filter
  const filteredConversations = conversations.filter((conv: any) => {
    switch (activeFilter) {
      case 'followers':
        return conv.partner?.isFollower === true
      case 'following':
        return conv.partner?.isFollowing === true
      case 'close_friends':
        return conv.partner?.isCloseFriend === true
      case 'request':
        return conv.partner?.isRequest === true
      case 'blocked':
        return conv.partner?.isBlocked === true
      case 'favorite':
        return conv.partner?.isFavorite === true
      default:
        return true // 'all' shows everything
    }
  })

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Filter Tabs */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-comments text-primary-light"></i>
          Messages
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('followers')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'followers'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Followers
          </button>
          <button
            onClick={() => setActiveFilter('following')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'following'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveFilter('close_friends')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'close_friends'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Close Friends
          </button>
          <button
            onClick={() => setActiveFilter('request')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'request'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Request
          </button>
          <button
            onClick={() => setActiveFilter('blocked')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'blocked'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Blocked
          </button>
          <button
            onClick={() => setActiveFilter('favorite')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === 'favorite'
                ? 'bg-primary text-white'
                : 'bg-light-gray text-text-light hover:bg-dark-gray'
            }`}
          >
            Favorite
          </button>
        </div>
        <div className="space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv: any) => (
              <div
                key={conv.partner?._id || conv._id}
                onClick={() => {
                  const partnerId = conv.partner?._id || conv.partner?._id
                  if (partnerId) {
                    setSelectedUserId(partnerId)
                    dispatch(fetchMessages(partnerId))
                  }
                }}
                className="flex items-center gap-3 p-3 bg-dark-gray rounded-lg hover:bg-light-gray transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                  {conv.partner?.profile?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{conv.partner?.profile?.fullName || 'User'}</div>
                  <div className="text-sm text-text-gray">{conv.lastMessage?.content?.text || conv.lastMessage?.text || 'No messages yet'}</div>
                </div>
                <div className="text-xs text-text-gray">
                  {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString() : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-text-gray">
              <i className="fas fa-comments text-4xl mb-4"></i>
              <p>No {activeFilter === 'all' ? '' : activeFilter.replace('_', ' ')} conversations yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-medium-gray rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-comment-dots text-primary-light"></i>
          Conversation
        </h3>
        <div className="bg-dark-gray rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
          {selectedUserId && messages.length > 0 ? (
            messages.map((msg: any) => {
              const isOwn = (msg.sender?._id || msg.sender)?.toString() === user?._id?.toString()
              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                  onContextMenu={(e) => { e.preventDefault(); openMenu(msg) }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                    {msg.sender?.profile?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                    <div className={`rounded-lg p-3 inline-block ${
                      isOwn
                        ? 'bg-primary rounded-tr-none'
                        : 'bg-light-gray rounded-tl-none'
                    }`}>
                      <p>{msg.content?.text || msg.text}</p>
                    </div>
                    {autoTranslate && msg.translation && (
                      <div className="flex items-center gap-2 mt-2 bg-light-gray rounded-lg px-3 py-2">
                        <button
                          onClick={() => dispatch(translateMessage({ text: msg.content?.text || msg.text, targetLanguage: translationLanguage }))}
                          className="text-primary-light text-xs flex items-center gap-1"
                        >
                          <i className="fas fa-language"></i> Translate
                        </button>
                        <span className="text-xs text-text-gray">Translated from Spanish</span>
                      </div>
                    )}
                    <div className="text-xs text-text-gray mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                      {msg.settings?.isEdited && <span className="ml-2 text-[10px] opacity-70">(edited)</span>}
                      {msg.settings?.isRecalled && <span className="ml-2 text-[10px] text-warning">deleted</span>}
                    </div>
                    {menuForMessage?._id === msg._id && (
                      <div className={`mt-2 inline-flex items-center gap-2 bg-medium-gray rounded-lg px-2 py-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <button onClick={handleReply} className="text-xs text-white hover:text-primary"><i className="fas fa-reply"></i> Reply</button>
                        {isOwn && <button onClick={handleEdit} className="text-xs text-white hover:text-primary"><i className="fas fa-edit"></i> Edit</button>}
                        {isOwn && <button onClick={handleRecall} className="text-xs text-danger hover:text-red-400"><i className="fas fa-trash-alt"></i> Delete</button>}
                        <div className="flex gap-1">
                          {['👍','❤️','😂','😮','😢','😡'].map(e => (
                            <button key={e} onClick={() => handleReact(e)} className="text-base">{e}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-text-gray">
              <i className="fas fa-comment-dots text-4xl mb-4"></i>
              <p>Select a conversation to view messages</p>
            </div>
          )}
          {isTyping && typingUser && (
            <TypingIndicator username={typingUser} />
          )}
        </div>

        {replyTo && (
          <div className="mt-2 text-xs text-text-gray bg-light-gray/20 rounded px-2 py-1 inline-flex items-center gap-2">
            <i className="fas fa-reply text-primary"></i>
            Replying to: <span className="text-white">{replyTo.content?.text || replyTo.text}</span>
            <button onClick={() => setReplyTo(null)} className="ml-2 text-text-gray hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <input
            ref={messageInputRef}
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-light-gray border-none rounded-full px-4 py-2 text-white placeholder-text-gray focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                if (typingTimeout) {
                  clearTimeout(typingTimeout)
                }
                handleSendMessage()
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
