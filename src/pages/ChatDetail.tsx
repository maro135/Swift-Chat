import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ArrowLeft, Send, Settings, X, Link as LinkIcon, Check, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../lib/ImageUpload';
import { toast } from 'sonner';

import { MessageItem } from '../components/MessageItem';
import { CommentDrawer } from '../components/CommentDrawer';

export function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeCommentMessage, setActiveCommentMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const fetchChat = async () => {
      let found = false;
      try {
        const docRef = doc(db, 'chats', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
           setChatInfo(snap.data());
           found = true;
        }
      } catch (e) {
        console.warn("Could not fetch as chat, trying channel", e);
      }

      if (!found) {
        try {
           const chanRef = doc(db, 'channels', id);
           const chanSnap = await getDoc(chanRef);
           if (chanSnap.exists()) {
              setChatInfo({ ...chanSnap.data(), isChannel: true });
           }
        } catch (e) {
           console.error("Could not fetch as channel either", e);
        }
      }
      setLoading(false);
    };
    fetchChat();
  }, [id]);

  useEffect(() => {
    if (!chatInfo || !id || !auth.currentUser) return;
    
    let path = chatInfo.isChannel ? 'channels' : 'chats';
    let subcoll = chatInfo.isChannel ? 'posts' : 'messages';
    
    const q = query(
      collection(db, path, id, subcoll),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data(), senderId: d.data().senderId || d.data().authorId })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatInfo?.isChannel, id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !auth.currentUser || !chatInfo) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      if (chatInfo.isChannel) {
        // Only owner can post to channel, let's let rules handle the rejection
        const msgRef = doc(collection(db, 'channels', id, 'posts'));
        await setDoc(msgRef, {
          authorId: auth.currentUser.uid,
          content: text,
          createdAt: serverTimestamp()
        });
      } else {
        const msgRef = doc(collection(db, 'chats', id, 'messages'));
        await setDoc(msgRef, {
          senderId: auth.currentUser.uid,
          content: text,
          status: 'sent',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error sending message', err);
      toast.error('Error sending message. Check permissions.');
    }
  };

  const handleHeaderClick = () => {
    if (chatInfo?.isChannel) {
      navigate(`/channel/${id}`);
    } else if (chatInfo?.type === 'direct' && chatInfo?.participantIds) {
      const otherUid = chatInfo.participantIds.find((pid: string) => pid !== auth.currentUser?.uid);
      if (otherUid) navigate(`/user/${otherUid}`);
    }
  };

  const openSettings = () => {
    setEditName(chatInfo?.name || '');
    setEditAvatarUrl(chatInfo?.avatarUrl || '');
    setEditDescription(chatInfo?.description || '');
    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (!chatInfo || !id || !auth.currentUser) return;
    setSavingSettings(true);
    try {
      const isChannel = chatInfo.isChannel;
      const docRef = doc(db, isChannel ? 'channels' : 'chats', id);
      const updateData: any = {
        name: editName.trim(),
        updatedAt: serverTimestamp()
      };
      if (editAvatarUrl.trim()) updateData.avatarUrl = editAvatarUrl.trim();
      if (isChannel) updateData.description = editDescription.trim();
      
      await updateDoc(docRef, updateData);
      setChatInfo({ ...chatInfo, ...updateData, avatarUrl: updateData.avatarUrl || chatInfo.avatarUrl });
      setShowSettings(false);
    } catch (e) {
      toast.error("Error updating settings. Make sure you have permission.");
    } finally {
      setSavingSettings(false);
    }
  };

  const canEdit = chatInfo && (
    (chatInfo.isChannel && chatInfo.ownerId === auth.currentUser?.uid) ||
    (chatInfo.type === 'group' && chatInfo.participantIds?.includes(auth.currentUser?.uid))
  );

  if (loading) {
    return <div className="flex-1 bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#050505]">
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0A0A0A] z-10">
        <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div 
          onClick={handleHeaderClick}
          className={`w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold overflow-hidden ${(chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          {chatInfo?.avatarUrl ? <img src={chatInfo.avatarUrl} className="w-full h-full object-cover" /> : chatInfo?.name?.substring(0, 1).toUpperCase() || '?'}
        </div>
        <div className="flex-1" onClick={handleHeaderClick} style={{ cursor: (chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'pointer' : 'default' }}>
          <h2 className={`text-white font-bold ${(chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'hover:underline' : ''}`}>{chatInfo?.name || 'Chat'}</h2>
          <p className="text-xs text-gray-400">{chatInfo?.type === 'group' ? 'Group' : chatInfo?.isChannel ? 'Channel' : 'Direct Message'}</p>
        </div>
        {canEdit && (
          <button onClick={openSettings} className="text-gray-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 text-sm">No messages yet. Say hello!</div>
        ) : (
          messages.map(msg => (
             <MessageItem 
                key={msg.id} 
                msg={msg} 
                chatId={id!} 
                isChannel={!!chatInfo?.isChannel} 
                onOpenComments={(msgId) => setActiveCommentMessage(msgId)} 
             />
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {(!chatInfo?.isChannel || chatInfo?.ownerId === auth.currentUser?.uid) && (
      <form onSubmit={handleSend} className="p-4 bg-[#0A0A0A] border-t border-white/5 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Message..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Send size={18} className="translate-x-[1px]" />
        </button>
      </form>
      )}

      {activeCommentMessage && (
        <CommentDrawer 
           chatId={id!} 
           messageId={activeCommentMessage} 
           isChannel={!!chatInfo?.isChannel} 
           onClose={() => setActiveCommentMessage(null)} 
        />
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Name</label>
                <input 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Avatar Picture</label>
                <ImageUpload value={editAvatarUrl} onChange={setEditAvatarUrl} />
              </div>
              {chatInfo?.isChannel && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                    <textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white min-h-[80px] focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Channel Link</label>
                    <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <input 
                        readOnly
                        value={`${window.location.origin}/chat/${id}`}
                        className="flex-1 bg-transparent py-2 px-3 text-sm text-zinc-400 focus:outline-none" 
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/chat/${id}`);
                          toast.success('Link copied to clipboard!');
                        }}
                        className="px-3 bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <LinkIcon size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              <button disabled={savingSettings} onClick={saveSettings} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold mt-2 disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all">
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
