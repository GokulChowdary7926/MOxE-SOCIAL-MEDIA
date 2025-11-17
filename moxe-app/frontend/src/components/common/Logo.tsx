import { useNavigate } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  onClick?: () => void
}

export default function Logo({ size = 'md', showText = true, className = '', onClick }: LogoProps) {
  const navigate = useNavigate()
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate('/')
    }
  }

  const sizeClasses = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', gap: 'gap-2' },
    md: { icon: 'w-12 h-12', text: 'text-2xl', gap: 'gap-3' },
    lg: { icon: 'w-16 h-16', text: 'text-3xl', gap: 'gap-4' },
  }

  const currentSize = sizeClasses[size]

  return (
    <div 
      className={`inline-flex items-center ${currentSize.gap} ${className} ${onClick || true ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Logo Icon */}
      <div className={`${currentSize.icon} relative rounded-lg`}>
        {/* Gradient Background */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600"></div>
        
        {/* White Outline with Corner Breaks */}
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Square outline with rounded corners and diagonal breaks at corners */}
          {/* Top edge */}
          <path d="M 20 10 L 80 10" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          {/* Right edge */}
          <path d="M 90 20 L 90 80" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          {/* Bottom edge */}
          <path d="M 80 90 L 20 90" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          {/* Left edge */}
          <path d="M 10 80 L 10 20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          {/* Corner breaks - diagonal lines at each corner */}
          <line x1="10" y1="10" x2="20" y2="20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="90" y1="10" x2="80" y2="20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="10" y1="90" x2="20" y2="80" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="90" y1="90" x2="80" y2="80" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        
        {/* Lowercase 'm' in cursive/handwritten style */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-white"
            style={{
              fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive, serif',
              fontSize: size === 'sm' ? '1.4rem' : size === 'md' ? '2rem' : '2.8rem',
              transform: 'translateY(-1px)',
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            m
          </span>
        </div>
      </div>
      
      {/* MOxE Text */}
      {showText && (
        <span className={`${currentSize.text} font-bold text-white tracking-tight`} style={{ fontFamily: 'sans-serif' }}>MOxE</span>
      )}
    </div>
  )
}

