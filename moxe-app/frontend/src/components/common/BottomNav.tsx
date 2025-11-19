interface BottomNavProps {
  currentPath: string
  onNavClick: (path: string) => void
}

export default function BottomNav({ currentPath, onNavClick }: BottomNavProps) {
  const navItems = [
    { path: '/', icon: 'fa-home', label: 'Feed' },
    { path: '/explore', icon: 'fa-search', label: 'Explore' },
    { path: '/map', icon: 'fa-map-marked-alt', label: 'Map' },
    { path: '/messages', icon: 'fa-comment', label: 'Messages' },
    { path: '/profile', icon: 'fa-user', label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[rgba(0,0,0,0.5)] backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border-t border-[rgba(255,255,255,0.1)] px-4 py-3 z-50">
      <div className="flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = currentPath === item.path || (item.path === '/' && currentPath === '/')
        return (
          <button
            key={item.path}
            onClick={() => onNavClick(item.path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-primary-light' : 'text-text-gray'
            }`}
          >
            <i className={`fas ${item.icon} text-2xl`}></i>
            <span className="text-xs">{item.label}</span>
          </button>
        )
      })}
      </div>
    </nav>
  )
}



