import { useState, useEffect } from "react";
import { Users, Search, X, Loader as Loader2 } from "lucide-react";
import { collection, query, where, getDocs, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../context/AuthContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from '../lib/ImageUpload';
import { motion } from 'motion/react';

export function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      const allGroups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(allGroups.filter((c: any) => c.type === 'group'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    if (!auth.currentUser) return;
    setCreating(true);
    setErrorMsg('');
    try {
      const groupRef = doc(collection(db, 'chats'));
      const groupData: any = {
        type: 'group',
        participantIds: [auth.currentUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        name: groupName.trim()
      };
      if (avatarUrl.trim() !== '') {
        groupData.avatarUrl = avatarUrl.trim();
      }
      await setDoc(groupRef, groupData);

      await setDoc(doc(db, 'chats', groupRef.id, 'participants', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        role: 'owner',
        createdAt: serverTimestamp()
      });

      setShowCreate(false);
      setGroupName('');
      navigate(`/chat/${groupRef.id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chats');
      setErrorMsg('Error creating group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-4 pt-2 bg-[#050505] relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all flex-shrink-0">
          <Users size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
          <Users size={48} className="text-gray-800 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Group Conversations</h2>
          <p className="text-gray-400 max-w-[280px] text-sm">Create structured communication spaces with admins and advanced moderation.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 bg-blue-600 text-white rounded-full px-6 py-2.5 font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            Create New Group
          </button>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {groups.map((group, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/chat/${group.id}`)}
              key={group.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xs flex-shrink-0 overflow-hidden">
                {group.avatarUrl ? <img src={group.avatarUrl} className="w-full h-full object-cover" /> : group.name ? group.name.substring(0, 2).toUpperCase() : 'G'}
              </div>
              <div className="flex-1 min-w-0 pointer-events-none">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="text-sm font-medium truncate text-white">{group.name}</h3>
                  <span className="text-[10px] text-zinc-600 shrink-0 ml-2">
                    {group.updatedAt?.toDate ? format(group.updatedAt.toDate(), "hh:mm a") : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{group.recentMessage || 'Group created'}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pb-safe">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">New Group</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Group Name</label>
                <input
                  value={groupName}
                  onChange={e => { setGroupName(e.target.value); setErrorMsg(''); }}
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Project Apollo"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Group Picture</label>
                <ImageUpload value={avatarUrl} onChange={setAvatarUrl} />
                {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
              </div>

              <button disabled={creating} onClick={handleCreateGroup} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold mt-2 disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {creating && <Loader2 size={16} className="animate-spin" />}
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
