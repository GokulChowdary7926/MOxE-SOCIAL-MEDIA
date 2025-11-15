import { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'

interface LiveReaction {
  id: string
  type: 'heart' | 'like' | 'fire' | 'clap'
  x: number
  y: number
}

interface LiveReactionsProps {
  postId: string
}

const reactionEmojis = {
  heart: '❤️',
  like: '👍',
  fire: '🔥',
  clap: '👏',
}

export default function LiveReactions({ postId }: LiveReactionsProps) {
  const [reactions, setReactions] = useState<LiveReaction[]>([])
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!isConnected || !socket) return

    socket.on('live_reaction_received', (data: any) => {
      if (data.postId === postId) {
        const newReaction: LiveReaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: data.reactionType || 'heart',
          x: Math.random() * 80 + 10, // Random x position (10-90%)
          y: Math.random() * 80 + 10, // Random y position (10-90%)
        }
        setReactions((prev) => [...prev, newReaction])

        // Remove reaction after animation
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== newReaction.id))
        }, 3000)
      }
    })

    return () => {
      socket.off('live_reaction_received')
    }
  }, [isConnected, socket, postId])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-2xl animate-bounce"
          style={{
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          {reactionEmojis[reaction.type]}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
      `}</style>
    </div>
  )
}


