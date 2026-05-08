import { useState } from 'react';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Bell, Key, X, Check } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ImageUpload } from '../lib/ImageUpload';

export function Profile() {
  const { user, profile, signOut } = useAuth();
  
  const [showEdit, setShowEdit] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const openEditModal = () => {
     setDisplayName(profile?.displayName || '');
     setUsername(profile?.username || '');
     setBio(profile?.bio || '');
     setAvatarUrl(profile?.avatarUrl || '');
     setShowEdit(true);
  };

  const handleSaveProfile = async () => {
     if (!auth.currentUser) return;
     setSaving(true);
     try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const updateData: any = {
           displayName: displayName.trim(),
           username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
           bio: bio.trim(),
           updatedAt: serverTimestamp()
        };
        if (avatarUrl.trim() !== '') {
           updateData.avatarUrl = avatarUrl.trim();
        }
        await updateDoc(userRef, updateData);
        setShowEdit(false);
        // Using window.location.reload to ensure all states update
        window.location.reload();
     } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'users');
        alert('Error updating profile');
     } finally {
        setSaving(false);
     }
  };

  const toggleNotification = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        notificationsEnabled: !profile?.notificationsEnabled,
      });
      window.location.reload();
    } catch(e) {
      alert("Error updating setting");
    }
  }

  const togglePrivateAccount = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isPrivate: !profile?.isPrivate,
      });
      window.location.reload();
    } catch(e) {
      alert("Error updating setting");
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 overflow-y-auto w-full max-w-md mx-auto relative">
      <div className="flex flex-col items-center mb-8 pt-4">
        <div className="w-24 h-24 bg-zinc-800 rounded-full mb-4 flex items-center justify-center border border-white/10 shadow-xl relative overflow-hidden">
           {profile?.avatarUrl ? (
             <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             <UserIcon size={40} className="text-zinc-600" />
           )}
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{profile?.displayName || user?.email?.split('@')[0] || 'User'}</h2>
        <p className="text-[11px] text-blue-500 font-mono mt-1">@{profile?.username || 'handle'}</p>
        
        <p className="text-center text-zinc-400 mt-4 text-sm max-w-xs leading-relaxed">{profile?.bio || 'Hey there! I am using Swift Chat.'}</p>
        <button onClick={openEditModal} className="mt-6 bg-white/5 border border-white/10 text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-white/10 transition-colors">Edit Profile</button>
      </div>

      <div className="flex justify-center divide-x divide-white/10 mb-8 border-y border-white/5 py-4 bg-[#0A0A0A]">
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white uppercase">{profile?.followersCount || 0}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Followers</p>
        </div>
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white uppercase">{profile?.followingCount || 0}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Following</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
           <ToggleItem icon={Shield} label="Private Account" description="Make your profile private" active={!!profile?.isPrivate} onToggle={togglePrivateAccount} />
           <ToggleItem icon={Bell} label="Notifications" description="Receive push notifications" active={profile?.notificationsEnabled !== false} onToggle={toggleNotification} />
        </div>
      </div>

      <button 
        onClick={signOut}
        className="mt-auto w-full bg-red-500/10 text-red-500 font-semibold rounded-2xl py-4 px-4 flex items-center justify-center space-x-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={20} />
        <span>Log Out</span>
      </button>

      <p className="text-center text-xs text-gray-600 mt-6 pb-4">Swift Chat v1.0.0</p>

      {/* EDIT PROFILE MODAL */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Edit Profile</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Display Name</label>
                <input 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Username</label>
                <input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Avatar Picture</label>
                <ImageUpload value={avatarUrl} onChange={setAvatarUrl} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bio</label>
                <textarea 
                  value={bio} 
                  onChange={e => setBio(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white min-h-[80px] focus:outline-none focus:border-blue-500" 
                />
              </div>
              
              <button disabled={saving} onClick={handleSaveProfile} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold mt-2 disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleItem({ icon: Icon, label, description, active, onToggle }: { icon: any, label: string, description: string, active: boolean, onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="flex items-center justify-between p-4 bg-[#0A0A0A] hover:bg-white/5 transition-colors cursor-pointer">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon size={16} className="text-zinc-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">{label}</span>
          <span className="text-[10px] text-zinc-500">{description}</span>
        </div>
      </div>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${active ? 'bg-blue-600' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
    </div>
  )
}
