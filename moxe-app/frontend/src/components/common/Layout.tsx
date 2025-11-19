import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-dark text-text-light">
      <div className="max-w-md mx-auto bg-dark-gray min-h-screen relative">
        <Header />
        <main className="pt-2 pb-20">
          <Outlet />
        </main>
        <BottomNav currentPath={location.pathname} onNavClick={handleNavClick} />
      </div>
    </div>
  )
}



