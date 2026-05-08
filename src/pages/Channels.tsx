import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../context/AuthContext';
import { Hash, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from '../lib/ImageUpload';

export function Channels() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const channelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in JS because you can't easily orderBy bool then date without composite index setup
      channelsData.sort((a: any, b: any) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return 0;
      });
      setChannels(channelsData);
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'channels');
       setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !handle.trim() || !auth.currentUser) return;
    setCreating(true);
    try {
      const channelRef = doc(collection(db, 'channels'));
      const channelData: any = {
        ownerId: auth.currentUser.uid,
        name: name.trim(),
        handle: handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        description: description.trim(),
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (avatarUrl.trim() !== '') {
        channelData.avatarUrl = avatarUrl.trim();
      }
      await setDoc(channelRef, channelData);
      setShowCreate(false);
      setName('');
      setHandle('');
      setDescription('');
      setAvatarUrl('');
      navigate(`/chat/${channelRef.id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'channels');
      alert(`Error creating channel: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  const handleSubscribe = async (channelId: string) => {
     if (!auth.currentUser) return;
     try {
       const subRef = doc(db, 'channels', channelId, 'subscribers', auth.currentUser.uid);
       const snap = await getDoc(subRef);
       if(!snap.exists()) {
         await setDoc(subRef, {
           userId: auth.currentUser.uid,
           createdAt: serverTimestamp()
         });
       }
       navigate(`/chat/${channelId}`);
     } catch (e) {
       handleFirestoreError(e, OperationType.CREATE, 'channels/subscribers');
     }
  }

  const verifiedChannels = channels.filter(c => (c as any).isVerified);
  const regularChannels = channels.filter(c => !(c as any).isVerified);

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 overflow-y-auto w-full no-scrollbar relative">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-1">Explore</p>
          <h2 className="text-3xl font-light tracking-tight">Channels</h2>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold shrink-0 hover:bg-gray-200 transition-colors">
          Create
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>
      ) : channels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
           <Hash size={48} className="text-gray-800 mb-4" />
           <p className="text-gray-400 font-medium">No channels found</p>
           <p className="text-gray-600 text-sm mt-1">Broadcast-based content systems start here.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {/* Verified Priority */}
          {verifiedChannels.map((channel) => (
            <div key={channel.id} className="relative w-full bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-3xl border border-blue-500/20 overflow-hidden flex items-center p-6 group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="relative z-10 flex flex-col gap-4 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 shadow-2xl border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-black italic text-white bg-gradient-to-br from-blue-500 to-indigo-700">
                    {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" /> : channel.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">{channel.name}</h3>
                      <span className="bg-blue-500 text-white rounded-full p-0.5 shadow-[0_0_10px_rgba(59,130,246,0.6)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                    </div>
                    <span className="text-blue-400/80 text-xs font-medium">@{channel.handle}</span>
                  </div>
                </div>
                <p className="text-blue-100/60 text-sm leading-relaxed line-clamp-2">{channel.description}</p>
                <button 
                  onClick={() => handleSubscribe(channel.id)}
                  className="bg-white text-black w-full py-2 rounded-full text-sm font-bold shadow-xl shadow-white/5 mt-2 hover:opacity-90 transition-opacity active:scale-95">
                  Subscribe
                </button>
              </div>
            </div>
          ))}

          {/* Regular Channels Grid */}
          <div className="grid grid-cols-2 gap-4">
            {regularChannels.map((channel) => (
              <div key={channel.id} className="bg-[#0A0A0A] border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center text-xl font-bold text-gray-500">
                    {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" /> : channel.name[0]}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1 text-white">{channel.name}</h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{channel.description || 'Welcome to this channel'}</p>
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-600 truncate mr-2">@{channel.handle}</span>
                  <button 
                    onClick={() => handleSubscribe(channel.id)}
                    className="text-xs font-bold text-blue-400 shrink-0 hover:text-blue-300">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Create Channel</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Channel Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Kotlin Developers" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Username Handle</label>
                <input value={handle} onChange={e=>setHandle(e.target.value)} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. kotlin_devs" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Channel Picture</label>
                <ImageUpload value={avatarUrl} onChange={setAvatarUrl} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white min-h-[80px] focus:outline-none focus:border-blue-500" placeholder="What is this channel about?"></textarea>
              </div>
              
              <button disabled={creating} onClick={handleCreate} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold mt-2 disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all">
                {creating ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
