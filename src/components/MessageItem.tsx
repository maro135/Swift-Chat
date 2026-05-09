import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { format } from 'date-fns';
import { MessageSquare, Eye, Edit2, Check, SmilePlus, Share2, CheckCheck } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';

interface MessageItemProps {
  key?: React.Key;
  msg: any;
  chatId: string;
  isChannel: boolean;
  onOpenComments: (msgId: string) => void;
}

export function MessageItem({ msg, chatId, isChannel, onOpenComments }: MessageItemProps) {
  const isMe = (msg.senderId || msg.authorId) === auth.currentUser?.uid;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showReactions, setShowReactions] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [senderInfo, setSenderInfo] = useState<any>(null);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  const path = isChannel ? 'channels' : 'chats';
  const subcoll = isChannel ? 'posts' : 'messages';

  useEffect(() => {
    if (inView && auth.currentUser) {
      const viewedBy = msg.viewedBy || [];
      if (!viewedBy.includes(auth.currentUser.uid)) {
        const msgRef = doc(db, path, chatId, subcoll, msg.id);
        updateDoc(msgRef, {
          viewedBy: arrayUnion(auth.currentUser.uid)
        }).catch(() => {});
      }
    }
  }, [inView, msg.id, msg.viewedBy, chatId, isChannel]);

  useEffect(() => {
    // Fetch sender info if not me
    const uid = msg.senderId || msg.authorId;
    if (uid && !isMe) {
        getDoc(doc(db, 'users', uid)).then(snap => {
            if (snap.exists()) setSenderInfo(snap.data());
        }).catch(() => {});
    }
  }, [msg.senderId, msg.authorId, isMe]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowReactions(false);
      }
    };
    if (showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactions]);

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === msg.content) {
      setIsEditing(false);
      return;
    }
    try {
      const msgRef = doc(db, path, chatId, subcoll, msg.id);
      await updateDoc(msgRef, {
        content: editContent.trim(),
        editedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch(e) {
      toast.error("Error editing message");
    }
  };

  const handleReaction = async (emojiObject: any) => {
    if (!auth.currentUser) return;
    const emoji = emojiObject.emoji || emojiObject;
    setShowReactions(false);
    try {
      const msgRef = doc(db, path, chatId, subcoll, msg.id);
      const reactions = msg.reactions || {};
      const currentEmojiUsers = reactions[emoji] || [];
      
      let newEmojiUsers;
      if (currentEmojiUsers.includes(auth.currentUser.uid)) {
        newEmojiUsers = currentEmojiUsers.filter((uid: string) => uid !== auth.currentUser?.uid);
      } else {
        newEmojiUsers = [...currentEmojiUsers, auth.currentUser.uid];
      }

      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: newEmojiUsers
      });
    } catch(e) {
      toast.error("Error adding reaction");
    }
  };

  const navigateToProfile = () => {
      const uid = msg.senderId || msg.authorId;
      if (uid && !isMe) navigate(`/user/${uid}`);
  };

  const handleShare = async () => {
    if (!chatId || !msg.id) return;
    const link = `${window.location.origin}/chat/${chatId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
          text: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard!");
      }
      if (isChannel && auth.currentUser) {
        const msgRef = doc(db, path, chatId, subcoll, msg.id);
        await updateDoc(msgRef, {
           sharesCount: increment(1)
        });
      }
    } catch (e) {
      // Ignored share cancel
    }
  };

  const viewsCount = (msg.viewedBy || []).length;
  const reactionsDisplay = Object.entries(msg.reactions || {}).filter(([_, users]: [string, any]) => users.length > 0);

  return (
    <div ref={ref} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} mb-2`}>
      {(!isMe && !isChannel && senderInfo) && (
          <span 
              onClick={navigateToProfile} 
              className="text-xs text-gray-400 ml-2 mb-1 cursor-pointer hover:underline"
          >
              {senderInfo.displayName || senderInfo.username || 'User'}
          </span>
      )}
      <div className={`relative max-w-[85%] rounded-2xl p-3 ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-white rounded-tl-sm'}`}>
        
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <textarea 
               value={editContent} 
               onChange={e => setEditContent(e.target.value)} 
               className="w-full bg-black/20 text-white rounded p-2 text-sm focus:outline-none resize-none"
               rows={3}
            />
            <div className="flex justify-end gap-2">
               <button onClick={() => setIsEditing(false)} className="text-xs text-white/70 hover:text-white px-2 py-1">Cancel</button>
               <button onClick={handleEdit} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-white font-medium flex items-center gap-1">
                 <Check size={14} /> Save
               </button>
            </div>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
        )}

        {/* Floating action menu on hover/tap */}
        {!isEditing && (
          <div className={`absolute -top-3 ${isMe ? '-left-6 md:-left-8' : '-right-6 md:-right-8'} opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex bg-[#1A1A1A] border border-white/10 rounded-full shadow-lg overflow-hidden`}>
            {isMe && (
              <button title="Edit" onClick={() => setIsEditing(true)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <Edit2 size={14} />
              </button>
            )}
            <button title="React" onClick={() => setShowReactions(!showReactions)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors relative">
                <SmilePlus size={14} />
            </button>
            {isChannel && (
               <button title="Share" onClick={handleShare} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors relative">
                 <Share2 size={14} />
               </button>
            )}
          </div>
        )}

        {showReactions && (
          <div ref={pickerRef} className={`absolute ${isMe ? '-top-10 right-0 md:right-auto md:left-full md:ml-2' : '-top-10 left-0 md:left-auto md:right-full md:mr-2'} z-50 animate-in fade-in zoom-in duration-200`}>
             <EmojiPicker 
                theme={Theme.DARK}
                onEmojiClick={handleReaction} 
                lazyLoadEmojis={true}
                searchDisabled={true}
                skinTonesDisabled={true}
                width={280}
                height={350}
             />
          </div>
        )}
      </div>

      {reactionsDisplay.length > 0 && (
         <div className={`flex flex-wrap gap-1 mt-1 z-10 relative ${isMe ? 'justify-end' : 'justify-start'}`}>
           {reactionsDisplay.map(([emoji, users]: [string, any]) => (
             <button 
               key={emoji} 
               onClick={() => handleReaction(emoji)}
               className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${users.includes(auth.currentUser?.uid) ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
             >
               <span>{emoji}</span>
               <span>{users.length}</span>
             </button>
           ))}
         </div>
      )}

      <div className={`flex items-center gap-3 text-[10px] text-gray-500 mt-1 px-1 w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
        <span className="flex items-center gap-1">
          {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "hh:mm a") : '...'}
          {isMe && !isChannel && (
            <span className={viewsCount > 0 ? "text-blue-500" : "text-zinc-600"}>
               {viewsCount > 0 ? <CheckCheck size={14} /> : (msg.status === 'sent' ? <Check size={14} /> : <Check size={14} className="opacity-50" />)}
            </span>
          )}
        </span>
        
        {msg.editedAt && (
          <span className="italic flex items-center gap-1">
            <Edit2 size={10} /> Edited {format(msg.editedAt.toDate(), "hh:mm a")}
          </span>
        )}

        <button 
           onClick={() => onOpenComments(msg.id)}
           className="flex items-center gap-1 hover:text-gray-300 transition-colors cursor-pointer"
        >
           <MessageSquare size={12} />
           <span>{msg.commentsCount || 0} Comments</span>
        </button>

        {isChannel && (
          <>
            <span className="flex items-center gap-1" title={`${viewsCount} views`}>
              <Eye size={12} />
              <span>{viewsCount}</span>
            </span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors" title={`${msg.sharesCount || 0} shares`} onClick={handleShare}>
              <Share2 size={12} />
              <span>{msg.sharesCount || 0}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
