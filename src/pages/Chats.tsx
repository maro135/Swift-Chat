import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../context/AuthContext';
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Search, X, User as UserIcon } from "lucide-react";
import { motion } from 'motion/react';

export function Chats() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) {
       setLoading(false);
       return;
    }
    const q = query(
      collection(db, 'chats'), 
      where('participantIds', 'array-contains', auth.currentUser.uid),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const allChats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(allChats.filter((c: any) => c.type === 'direct'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showCreate && auth.currentUser) {
      // Fetch some users to display
      const fetchUsers = async () => {
        try {
          const userQ = query(collection(db, 'users'), limit(20));
          const snap = await getDocs(userQ);
          const users = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.id !== auth.currentUser?.uid);
          setAvailableUsers(users);
        } catch(e) {
          console.error("Failed to fetch users");
        }
      }
      fetchUsers();
    }
  }, [showCreate]);

  const startChatWithUser = async (targetUser: any) => {
    if (!auth.currentUser) return;
    setCreating(true);
    setErrorMsg('');
    try {
      const targetUserId = targetUser.id;

      const existingQ = query(
        collection(db, 'chats'),
        where('participantIds', 'array-contains', auth.currentUser.uid)
      );
      const existingSnap = await getDocs(existingQ);
      const exists = existingSnap.docs.some(d => d.data().type === 'direct' && (d.data().participantIds || []).includes(targetUserId));
      
      if (exists) {
        setErrorMsg('Chat already exists!');
        return;
      }

      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        type: 'direct',
        participantIds: [auth.currentUser.uid, targetUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        name: targetUser.displayName || targetUser.username
      });

      await setDoc(doc(db, 'chats', chatRef.id, 'participants', auth.currentUser.uid), {
         userId: auth.currentUser.uid,
         role: 'owner',
         createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'chats', chatRef.id, 'participants', targetUserId), {
         userId: targetUserId,
         role: 'member',
         createdAt: serverTimestamp()
      });

      setShowCreate(false);
      navigate(`/chat/${chatRef.id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chats');
      setErrorMsg('Error creating chat');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateChat = async () => {
    if (!targetUsername.trim() || !auth.currentUser) return;
    setCreating(true);
    setErrorMsg('');
    try {
      const cleanUsername = targetUsername.trim().replace('@', '');
      const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
      const userSnap = await getDocs(userQ);
      
      if (userSnap.empty) {
        setErrorMsg('User not found. Try exact username.');
        setCreating(false);
        return;
      }
      await startChatWithUser({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chats');
      setErrorMsg('Error creating chat');
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] p-4 relative">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Search chats..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition flex-shrink-0">
          <MessageSquare size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>
      ) : chats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
           <MessageSquare size={48} className="text-gray-800 mb-4" />
           <p className="text-gray-400 font-medium">No chats yet</p>
           <p className="text-gray-600 text-sm mt-1">Start a conversation with a contact</p>
           <button 
             onClick={() => setShowCreate(true)}
             className="mt-6 bg-blue-600 text-white rounded-full px-6 py-2 font-medium hover:bg-blue-700 active:scale-95 transition-all">
             New Chat
           </button>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/chat/${chat.id}`)} 
              key={chat.id} 
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer active:scale-95 duration-200"
            >
               <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs flex-shrink-0 overflow-hidden">
                 {chat.avatarUrl ? <img src={chat.avatarUrl} className="w-full h-full object-cover" /> : chat.name ? chat.name.substring(0, 2).toUpperCase() : 'U'}
               </div>
               <div className="flex-1 min-w-0 pointer-events-none">
                 <div className="flex justify-between items-center mb-1">
                   <h3 className="text-sm font-medium truncate text-white">{chat.name || 'Unknown User'}</h3>
                   <span className="text-[10px] opacity-40">
                     {chat.updatedAt?.toDate ? format(chat.updatedAt.toDate(), "hh:mm a") : ''}
                   </span>
                 </div>
                 <div className="flex items-center gap-1">
                   {chat.lastMessageSenderId === auth.currentUser?.uid && (
                      <span className="text-blue-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg></span>
                   )}
                   <p className="text-xs opacity-50 text-white truncate">{chat.recentMessage || 'Started a new chat'}</p>
                 </div>
               </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE CHAT MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">New Direct Message</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Search by username</label>
                <div className="flex gap-2">
                  <input 
                    value={targetUsername} 
                    onChange={e => { setTargetUsername(e.target.value); setErrorMsg(''); }} 
                    type="text" 
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                    placeholder="e.g. kotlin_devs" 
                  />
                  <button onClick={handleCreateChat} disabled={creating || !targetUsername.trim()} className="bg-blue-600 text-white rounded-xl px-4 font-bold disabled:opacity-50 text-sm">
                    Find
                  </button>
                </div>
                {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
              </div>

              {availableUsers.length > 0 && (
                <div className="mt-6 border-t border-white/5 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Suggested Users</p>
                  <div className="space-y-2">
                    {availableUsers.map(u => (
                      <div onClick={() => startChatWithUser(u)} key={u.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon size={14} className="text-zinc-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{u.displayName || u.username}</span>
                          <span className="text-[10px] text-blue-400">@{u.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
