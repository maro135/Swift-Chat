/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { MobileLayout } from './components/layout/MobileLayout';
import { Chats } from './pages/Chats';
import { Groups } from './pages/Groups';
import { Channels } from './pages/Channels';
import { Profile } from './pages/Profile';
import { ChatDetail } from './pages/ChatDetail';
import { UserProfile } from './pages/UserProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chat/:id" element={<ChatDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          
          <Route element={<MobileLayout />}>
            <Route path="/" element={<Navigate to="/chats" replace />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
