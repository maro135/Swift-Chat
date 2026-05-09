import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../context/AuthContext';
import { ArrowLeft, Send, Settings, X, Link as LinkIcon, Check, Plus, Trash2, Mic, SmilePlus, Phone, Video, MoreVertical, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../lib/ImageUpload';
import { toast } from 'sonner';

import { MessageItem } from '../components/MessageItem';
import { CommentDrawer } from '../components/CommentDrawer';

import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Image, Video as VideoIcon, Camera, File, MapPin, Contact, BarChart2 } from 'lucide-react';

export function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeCommentMessage, setActiveCommentMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<HTMLDivElement>(null);

  // Close Pickers on click outside
  useEffect(() => {
    const handlePickersClickOutside = (e: MouseEvent) => {
        if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
            setShowEmojiPicker(false);
        }
        if (showAttachments && attachmentsRef.current && !attachmentsRef.current.contains(e.target as Node)) {
            setShowAttachments(false);
        }
        if (showDropdown) {
            setShowDropdown(false);
        }
    };
    if (showEmojiPicker || showAttachments || showDropdown) {
       document.addEventListener('mousedown', handlePickersClickOutside);
    }
    return () => document.removeEventListener('mousedown', handlePickersClickOutside);
  }, [showEmojiPicker, showAttachments, showDropdown]);

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    let unsubscribeTyping: () => void = () => {};
    if (!chatInfo.isChannel) {
        const typingQ = query(collection(db, `chats/${id}/typing`));
        unsubscribeTyping = onSnapshot(typingQ, (snap) => {
            const currentlyTyping: string[] = [];
            snap.docs.forEach(docSnap => {
                if (docSnap.id !== auth.currentUser?.uid && docSnap.data().isTyping) {
                   currentlyTyping.push(docSnap.id);
                }
            });
            setTypingUsers(currentlyTyping);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, `chats/${id}/typing`);
        });
    }

    return () => { unsubscribe(); unsubscribeTyping(); }
  }, [chatInfo?.isChannel, id]);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    if (!auth.currentUser || chatInfo?.isChannel) return;

    const path = `chats/${id}/typing`;
    const typingRef = doc(db, path, auth.currentUser.uid);
    setDoc(typingRef, { isTyping: true, updatedAt: serverTimestamp() }, { merge: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        setDoc(typingRef, { isTyping: false, updatedAt: serverTimestamp() }, { merge: true });
    }, 2000);
  };
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
        const chatRef = doc(db, 'chats', id);
        await updateDoc(chatRef, {
            recentMessage: text,
            lastMessageSenderId: auth.currentUser.uid,
            updatedAt: serverTimestamp()
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
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0A0A0A] z-10 sticky top-0 shadow-sm backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors p-1">
          <ArrowLeft size={24} />
        </button>
        <div 
          onClick={handleHeaderClick}
          className={`w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold overflow-hidden transition-transform active:scale-95 ${(chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          {chatInfo?.avatarUrl ? <img src={chatInfo.avatarUrl} className="w-full h-full object-cover" /> : chatInfo?.name?.substring(0, 1).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0" onClick={handleHeaderClick} style={{ cursor: (chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'pointer' : 'default' }}>
          <h2 className={`text-white font-bold truncate text-base ${(chatInfo?.type === 'direct' || chatInfo?.isChannel) ? 'hover:underline' : ''}`}>{chatInfo?.name || 'Chat'}</h2>
          <p className={`text-xs truncate tracking-wide ${typingUsers.length ? 'text-blue-500 font-medium' : 'text-zinc-500'}`}>
            {typingUsers.length > 0 ? 'typing...' : (chatInfo?.type === 'group' ? 'Group' : chatInfo?.isChannel ? 'Channel' : 'online')}
          </p>
        </div>
        <div className="flex items-center gap-3 relative">
            <button className="text-zinc-400 hover:text-white transition-colors p-1">
               <Phone size={20} />
            </button>
            <button className="text-zinc-400 hover:text-white transition-colors p-1">
               <Video size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }} className="text-zinc-400 hover:text-white transition-colors p-1 relative z-20">
               <MoreVertical size={20} />
            </button>
            
            {showDropdown && (
              <div className="absolute top-[120%] right-0 w-48 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200" onMouseDown={e => e.stopPropagation()}>
                 <button onClick={handleHeaderClick} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-3">
                    <User size={16} className="text-zinc-400" /> View Profile
                 </button>
                 <button onClick={() => {toast("Search not implemented")}} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-3">
                    <Search size={16} className="text-zinc-400" /> Search
                 </button>
                 {canEdit && (
                 <button onClick={() => { setShowDropdown(false); openSettings(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-3">
                    <Settings size={16} className="text-zinc-400" /> Settings
                 </button>
                 )}
                 <div className="h-px bg-white/10 my-1 mx-2"></div>
                 <button className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3">
                    <Trash2 size={16} /> Delete Chat
                 </button>
              </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 text-sm">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg, i) => (
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
      <div className="relative">
      {showAttachments && (
         <div ref={attachmentsRef} className="absolute bottom-full mb-2 left-4 z-50 bg-[#1A1A1A] border border-white/10 rounded-3xl p-4 shadow-2xl origin-bottom-left animate-in zoom-in-95 duration-200 grid grid-cols-4 gap-4 w-[280px]">
             {[ 
               { icon: Image, label: 'Photo', color: 'text-blue-400', bg: 'bg-blue-400/10' },
               { icon: VideoIcon, label: 'Video', color: 'text-purple-400', bg: 'bg-purple-400/10' },
               { icon: Camera, label: 'Camera', color: 'text-pink-400', bg: 'bg-pink-400/10' },
               { icon: File, label: 'File', color: 'text-orange-400', bg: 'bg-orange-400/10' },
               { icon: MapPin, label: 'Location', color: 'text-green-400', bg: 'bg-green-400/10' },
               { icon: Contact, label: 'Contact', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
               { icon: BarChart2, label: 'Poll', color: 'text-teal-400', bg: 'bg-teal-400/10' }
             ].map(item => (
                <button key={item.label} onClick={() => { setShowAttachments(false); toast('Not implemented'); }} className="flex flex-col items-center gap-1 group">
                   <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110 active:scale-95`}>
                      <item.icon size={20} className={item.color} />
                   </div>
                   <span className="text-[10px] text-zinc-400 font-medium">{item.label}</span>
                </button>
             ))}
         </div>
      )}

      <form onSubmit={handleSend} className="p-3 bg-[#0A0A0A] border-t border-white/5 flex flex-col gap-2 pb-safe relative z-40">
        <div className="flex items-end gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-[28px] flex items-end min-h-[44px] overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:bg-white/10 shadow-sm">
              <button type="button" onClick={() => setShowAttachments(!showAttachments)} className="p-3 text-zinc-400 hover:text-white transition-colors shrink-0">
                 <Plus size={20} />
              </button>
              <textarea 
                value={newMessage}
                onChange={handleTyping}
                placeholder="Message..." 
                className="flex-1 bg-transparent py-[11px] px-0 text-white placeholder:text-zinc-500 focus:outline-none resize-none max-h-[120px] scrollbar-hide text-[15px] leading-snug"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) handleSend(e);
                  }
                }}
              />
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 transition-colors shrink-0 ${showEmojiPicker ? 'text-blue-500' : 'text-zinc-400 hover:text-white'}`}>
                 <SmilePlus size={20} />
              </button>
            </div>
            <div className="shrink-0 h-[44px] flex items-end">
              <button type="submit" disabled={!newMessage.trim()} className={`w-[44px] h-[44px] rounded-[22px] flex items-center justify-center transition-all duration-300 ${newMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                {newMessage.trim() ? <Send size={18} className="translate-x-[2px] translate-y-[1px]" /> : <Mic size={20} />}
              </button>
            </div>
        </div>
        
        {showEmojiPicker && (
             <div ref={emojiPickerRef} className="w-full h-[250px] animate-in slide-in-from-bottom-2 duration-200 mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#1A1A1A]">
                 <EmojiPicker 
                     theme={Theme.DARK}
                     onEmojiClick={(e) => { setNewMessage(prev => prev + e.emoji); setShowEmojiPicker(false); }}
                     lazyLoadEmojis={true}
                     width="100%"
                     height={250}
                  />
             </div>
        )}
      </form>
      </div>
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
