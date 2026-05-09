import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Send, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CommentDrawerProps {
  chatId: string;
  messageId: string;
  isChannel: boolean;
  onClose: () => void;
}

export function CommentDrawer({ chatId, messageId, isChannel, onClose }: CommentDrawerProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    let path = isChannel ? 'channels' : 'chats';
    let subcoll = isChannel ? 'posts' : 'messages';
    const q = query(
      collection(db, path, chatId, subcoll, messageId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const newComments = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setComments(newComments);

      const missingUids = new Set<string>();
      newComments.forEach(c => {
        if (!usersInfo[c.authorId]) missingUids.add(c.authorId);
      });

      if (missingUids.size > 0) {
        const newUsersInfo = { ...usersInfo };
        for (const uid of Array.from(missingUids)) {
          try {
            const u = await getDoc(doc(db, 'users', uid));
            if (u.exists()) newUsersInfo[uid] = u.data();
          } catch (e) {}
        }
        setUsersInfo(newUsersInfo);
      }

      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatId, messageId, isChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser || sending) return;

    const text = newComment.trim();
    setNewComment('');
    setSending(true);

    try {
      let path = isChannel ? 'channels' : 'chats';
      let subcoll = isChannel ? 'posts' : 'messages';

      const commentRef = doc(collection(db, path, chatId, subcoll, messageId, 'comments'));
      await setDoc(commentRef, {
        authorId: auth.currentUser.uid,
        content: text,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      toast.error("Error posting comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        onClick={onClose}
        onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
      />
      <div className="relative bg-[#0A0A0A] border-t border-white/10 rounded-t-3xl w-full max-w-md mx-auto flex flex-col h-[75vh] shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-white/5 shrink-0">
          <h3 className="text-white font-bold text-sm">Comments</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2 active:scale-95 rounded-full hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">No comments yet.</div>
          ) : (
            comments.map(c => {
              const u = usersInfo[c.authorId];
              return (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden text-blue-400 text-xs font-bold">
                    {u?.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u?.displayName?.substring(0, 1).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-white">{u?.displayName || u?.username || 'User'}</span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), "MMM d, hh:mm a") : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1 break-words">{c.content}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2 shrink-0 pb-safe">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={!newComment.trim() || sending} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all flex-shrink-0 active:scale-95">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="translate-x-[1px]" />}
          </button>
        </form>
      </div>
    </div>
  );
}
