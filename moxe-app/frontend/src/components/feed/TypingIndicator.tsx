interface TypingIndicatorProps {
  username?: string
}

export default function TypingIndicator({ username }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-light-gray flex items-center justify-center">
        <span className="text-xs font-bold text-text-gray">{username?.charAt(0) || 'U'}</span>
      </div>
      <div className="bg-light-gray rounded-lg rounded-tl-none px-4 py-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-text-gray rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-text-gray rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-text-gray rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}


