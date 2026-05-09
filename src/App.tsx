import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { MobileLayout } from './components/layout/MobileLayout';
import { Chats } from './pages/Chats';
import { Groups } from './pages/Groups';
import { Channels } from './pages/Channels';
import { Profile } from './pages/Profile';
import { ChatDetail } from './pages/ChatDetail';
import { UserProfile } from './pages/UserProfile';
import { ChannelProfile } from './pages/ChannelProfile';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/chat/:id" element={<ChatDetail />} />
      <Route path="/user/:id" element={<UserProfile />} />
      <Route path="/channel/:id" element={<ChannelProfile />} />

      <Route element={<MobileLayout />}>
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className: 'rounded-2xl border-white/10 bg-[#1A1A1A] text-white text-sm',
          duration: 2500,
        }}
      />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
