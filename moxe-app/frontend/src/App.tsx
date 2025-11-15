import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { RootState } from './store'
import { verifyToken } from './store/slices/authSlice'
import { useDispatch } from 'react-redux'
import { AppDispatch } from './store'
import Layout from './components/common/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Map from './pages/Map'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import CreatePost from './pages/CreatePost'
import Lifestyle from './pages/Lifestyle'
import NearbyMessaging from './pages/NearbyMessaging'
import NearbyPlaces from './pages/NearbyPlaces'
import TranslationSettings from './pages/TranslationSettings'
import SOSEmergency from './pages/SOSEmergency'
import MOXEStore from './pages/MOXEStore'
import ContentSettings from './pages/ContentSettings'
import FullScreenMap from './pages/FullScreenMap'
import SnapMap from './pages/SnapMap'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import OTPVerification from './pages/auth/OTPVerification'
import AccountSettings from './pages/settings/AccountSettings'
import PrivacySettings from './pages/settings/PrivacySettings'
import NotificationSettings from './pages/settings/NotificationSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import BlockedUsers from './pages/settings/BlockedUsers'
import DataExport from './pages/settings/DataExport'
import AccessibilitySettings from './pages/settings/AccessibilitySettings'
import LanguageRegionSettings from './pages/settings/LanguageRegionSettings'
import ConnectedAppsSettings from './pages/settings/ConnectedAppsSettings'
import Discover from './pages/Discover'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth)

  // Verify token on app load
  useEffect(() => {
    if (token && !isAuthenticated) {
      dispatch(verifyToken())
    }
  }, [token, isAuthenticated, dispatch])

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route path="/verify-otp" element={!isAuthenticated ? <OTPVerification /> : <Navigate to="/" />} />
      
      {/* Full-screen map (outside Layout for full-screen experience) */}
      <Route path="/map/fullscreen" element={isAuthenticated ? <FullScreenMap /> : <Navigate to="/login" />} />
      <Route path="/map/snap" element={isAuthenticated ? <SnapMap /> : <Navigate to="/login" />} />
      
      <Route element={<Layout />}>
        <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
        <Route path="/explore" element={isAuthenticated ? <Explore /> : <Navigate to="/login" />} />
        <Route path="/map" element={isAuthenticated ? <Map /> : <Navigate to="/login" />} />
        <Route path="/messages" element={isAuthenticated ? <Messages /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/profile/:userId" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
        <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" />} />
        <Route path="/create-post" element={isAuthenticated ? <CreatePost /> : <Navigate to="/login" />} />
        <Route path="/lifestyle" element={isAuthenticated ? <Lifestyle /> : <Navigate to="/login" />} />
        <Route path="/nearby-messaging" element={isAuthenticated ? <NearbyMessaging /> : <Navigate to="/login" />} />
        <Route path="/nearby-places" element={isAuthenticated ? <NearbyPlaces /> : <Navigate to="/login" />} />
        <Route path="/translation-settings" element={isAuthenticated ? <TranslationSettings /> : <Navigate to="/login" />} />
        <Route path="/sos-emergency" element={isAuthenticated ? <SOSEmergency /> : <Navigate to="/login" />} />
        <Route path="/store" element={isAuthenticated ? <MOXEStore /> : <Navigate to="/login" />} />
        <Route path="/settings/content" element={isAuthenticated ? <ContentSettings /> : <Navigate to="/login" />} />
        <Route path="/settings/account" element={isAuthenticated ? <AccountSettings /> : <Navigate to="/login" />} />
        <Route path="/settings/privacy" element={isAuthenticated ? <PrivacySettings /> : <Navigate to="/login" />} />
        <Route path="/settings/notifications" element={isAuthenticated ? <NotificationSettings /> : <Navigate to="/login" />} />
        <Route path="/settings/security" element={isAuthenticated ? <SecuritySettings /> : <Navigate to="/login" />} />
        <Route path="/settings/blocked-users" element={isAuthenticated ? <BlockedUsers /> : <Navigate to="/login" />} />
        <Route path="/settings/data-export" element={isAuthenticated ? <DataExport /> : <Navigate to="/login" />} />
        <Route path="/settings/accessibility" element={isAuthenticated ? <AccessibilitySettings /> : <Navigate to="/login" />} />
        <Route path="/settings/language-region" element={isAuthenticated ? <LanguageRegionSettings /> : <Navigate to="/login" />} />
        <Route path="/settings/connected-apps" element={isAuthenticated ? <ConnectedAppsSettings /> : <Navigate to="/login" />} />
        <Route path="/discover" element={isAuthenticated ? <Discover /> : <Navigate to="/login" />} />
      </Route>
    </Routes>
  )
}

export default App


