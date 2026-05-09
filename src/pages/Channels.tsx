import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../context/AuthContext';
import { Hash, X, Search, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from '../lib/ImageUpload';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function Channels() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const channelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      toast.error(`Error creating channel: ${e instanceof Error ? e.message : 'Unknown error'}`);
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

  // Filter and Score Channels
  const filteredChannels = useMemo(() => {
     let result = [...channels];
     
     // Privacy filter: don't show private channels in global list unless we're searching for exact link
     // Actually, if a channel is private, maybe it ONLY shows via direct link.
     // So hide `isPrivate` unless exact search match.
     
     if (searchQuery.trim()) {
       const queryText = searchQuery.toLowerCase().trim();
       
       result = result.filter(c => {
         // Direct link search format check
         if (queryText.includes(c.id.toLowerCase())) return true;
         // Handle / Name matching
         const matchName = c.name?.toLowerCase().includes(queryText);
         const matchHandle = c.handle?.toLowerCase().includes(queryText);
         return matchName || matchHandle;
       });
     } else {
       // Do not show private channels in standard discovery
       result = result.filter(c => !c.isPrivate);
     }

     // Smart scoring
     result.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        if (a.isVerified) scoreA += 1000;
        if (b.isVerified) scoreB += 1000;
        
        // Simulating activity/popularity score
        const ageA = a.createdAt?.toMillis ? Date.now() - a.createdAt.toMillis() : 0;
        const ageB = b.createdAt?.toMillis ? Date.now() - b.createdAt.toMillis() : 0;
        
        // Newer channels get a slight initial boost, but maybe it stabilizes
        scoreA -= ageA / 10000000;
        scoreB -= ageB / 10000000;

        return scoreB - scoreA;
     });

     return result;
  }, [channels, searchQuery]);

  const verifiedChannels = filteredChannels.filter(c => c.isVerified);
  const regularChannels = filteredChannels.filter(c => !c.isVerified);

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 overflow-y-auto w-full no-scrollbar relative">
      <div className="flex items-end justify-between mb-6">
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

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-zinc-500" />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
          placeholder="Search by name, @handle, or link..."
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>
      ) : filteredChannels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
           <Hash size={48} className="text-zinc-800 mb-4" />
           <p className="text-zinc-400 font-medium">No results found</p>
           {searchQuery ? (
             <p className="text-zinc-600 text-sm mt-1">Try a different search term or check the link.</p>
           ) : (
             <p className="text-zinc-600 text-sm mt-1">Broadcast-based content systems start here.</p>
           )}
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {searchQuery && (
             <div className="text-white font-bold mb-4">Search Results</div>
          )}
          
          {verifiedChannels.length > 0 && !searchQuery && (
            <div className="mb-8">
               <div className="flex justify-between items-end mb-4">
                  <h3 className="text-white font-bold text-lg">Trending Channels</h3>
                  <span className="text-blue-500 text-xs font-bold uppercase cursor-pointer hover:underline">See all</span>
               </div>
               <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-6 px-6 snap-x">
                 {verifiedChannels.map((channel, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     key={channel.id} 
                     onClick={() => navigate(`/channel/${channel.id}`)}
                     className="snap-start shrink-0 w-[240px] relative bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden flex flex-col p-5 group cursor-pointer hover:border-blue-500/30 transition-colors"
                   >
                     <div className="flex items-start justify-between mb-4">
                         <div className="w-14 h-14 rounded-2xl bg-zinc-800 shadow-xl overflow-hidden flex items-center justify-center text-xl font-black text-white">
                           {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" /> : (channel.name || 'C').substring(0,2).toUpperCase()}
                         </div>
                         <span className="bg-blue-500 text-white rounded-full p-0.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                           <Check size={12} strokeWidth={3} />
                         </span>
                     </div>
                     <h3 className="text-lg font-bold text-white mb-1 truncate">{channel.name}</h3>
                     <span className="text-blue-400/80 text-xs font-medium mb-3">@{channel.handle}</span>
                     <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-4 flex-1">{channel.description}</p>
                     <button 
                       onClick={(e) => { e.stopPropagation(); navigate(`/chat/${channel.id}`); }}
                       className="bg-white/10 text-white w-full py-2 rounded-xl text-xs font-bold hover:bg-white hover:text-black transition-colors active:scale-95">
                       View Channel
                     </button>
                   </motion.div>
                 ))}
               </div>
            </div>
          )}

          {regularChannels.length > 0 && (
            <div>
               {!searchQuery && <h3 className="text-white font-bold text-lg mb-4">Suggested Discoveries</h3>}
               <div className="grid grid-cols-2 gap-4">
                 {regularChannels.map((channel, i) => (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.05 }}
                     key={channel.id} 
                     onClick={() => navigate(`/channel/${channel.id}`)}
                     className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-4 flex flex-col items-center text-center cursor-pointer hover:bg-white/5 transition-colors active:scale-95 group"
                   >
                     <div className="w-16 h-16 rounded-full bg-zinc-800 shadow-lg border border-white/5 overflow-hidden flex items-center justify-center text-lg font-bold text-white mb-3 group-hover:border-blue-500/50 transition-colors">
                       {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" /> : (channel.name || 'C').substring(0,2).toUpperCase()}
                     </div>
                     <h3 className="text-white font-bold text-sm w-full truncate">{channel.name}</h3>
                     <span className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1 mb-3">@{channel.handle}</span>
                     <button 
                       onClick={(e) => { e.stopPropagation(); navigate(`/chat/${channel.id}`); }}
                       className="w-full py-2 bg-blue-600/10 text-blue-500 text-xs font-bold rounded-xl hover:bg-blue-600/20 active:scale-95 transition-all">
                       Explore
                     </button>
                   </motion.div>
                 ))}
               </div>
            </div>
          )}
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
