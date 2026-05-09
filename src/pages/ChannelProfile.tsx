import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, serverTimestamp, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ArrowLeft, Hash, Users, Trash2, CreditCard as Edit3, MessageSquare, Settings, Shield, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ChannelProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!id || !auth.currentUser) return;
    const fetchChannel = async () => {
      try {
        const chanRef = doc(db, 'channels', id);
        const snap = await getDoc(chanRef);
        if (snap.exists()) {
          setChannel(snap.data());
        }
      } catch (e) {
        console.error('Error fetching channel profile', e);
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();

    const unsubFollowers = onSnapshot(collection(db, 'channels', id, 'subscribers'), (snap) => {
      setFollowerCount(snap.size);
      setIsFollowing(snap.docs.some(d => d.id === auth.currentUser?.uid));
    });

    return () => {
      unsubFollowers();
    };
  }, [id]);

  const toggleFollow = async () => {
    if (!auth.currentUser || !id || togglingFollow) return;
    setTogglingFollow(true);
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'channels', id, 'subscribers', auth.currentUser.uid));
      } else {
        await setDoc(doc(db, 'channels', id, 'subscribers', auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      toast.error("Error toggling follow");
    } finally {
      setTogglingFollow(false);
    }
  };

  const deleteChannel = async () => {
    if (!auth.currentUser || !id) return;
    if (window.confirm("Are you sure you want to delete this channel? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'channels', id));
        navigate('/channels');
      } catch (e) {
        toast.error("Error deleting channel");
      }
    }
  };

  const togglePrivate = async () => {
    if (!auth.currentUser || !id) return;
    try {
      await updateDoc(doc(db, 'channels', id), {
        isPrivate: !channel?.isPrivate
      });
      setChannel({ ...channel, isPrivate: !channel?.isPrivate });
      toast.success("Privacy updated");
    } catch (e) {
      toast.error("Error updating privacy setting");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#050505]">
        <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-[#0A0A0A] pt-safe">
          <button onClick={() => navigate(-1)} className="text-white p-2 bg-white/5 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="h-5 w-28 bg-white/10 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col h-screen bg-[#050505]">
        <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-[#0A0A0A] pt-safe">
          <button onClick={() => navigate(-1)} className="text-white p-2 bg-white/5 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <span className="text-white font-bold">Channel</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Hash size={48} className="text-zinc-700 mb-4" />
          <h2 className="text-xl font-bold text-white">Channel Not Found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 hover:text-blue-400 font-medium active:scale-95">Go Back</button>
        </div>
      </div>
    );
  }

  const isOwner = channel.ownerId === auth.currentUser?.uid;

  if (showSettings) {
    return (
      <div className="flex flex-col h-screen bg-[#050505] overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-[#0A0A0A] z-10 sticky top-0 pt-safe shrink-0">
          <button onClick={() => setShowSettings(false)} className="text-white hover:text-blue-400 transition-colors p-2 -ml-1 rounded-full hover:bg-white/5 active:scale-95">
            <ArrowLeft size={22} />
          </button>
          <span className="text-white font-bold text-sm">Channel Settings</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
            <div onClick={togglePrivate} className="flex items-center justify-between p-4 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <Shield size={16} className="text-zinc-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Private Channel</span>
                  <span className="text-[10px] text-zinc-500">Hide from global discovery</span>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${channel?.isPrivate ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${channel?.isPrivate ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-red-500/10 mt-4">
            <div onClick={deleteChannel} className="flex items-center space-x-3 p-4 hover:bg-red-500/10 active:bg-red-500/20 transition-colors cursor-pointer text-red-500">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Delete Channel</span>
                <span className="text-[10px] opacity-70">This action cannot be undone</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#050505] overflow-y-auto w-full no-scrollbar">
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#0A0A0A] z-10 sticky top-0 shrink-0 pt-safe">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors p-2 -ml-1 rounded-full hover:bg-white/5 active:scale-95">
            <ArrowLeft size={22} />
          </button>
          <span className="text-white font-bold text-sm">Channel Profile</span>
        </div>
        {isOwner && (
          <button onClick={() => setShowSettings(true)} className="text-zinc-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full active:scale-95">
            <Settings size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center mt-8 mb-6 px-5">
        <div className="w-20 h-20 bg-blue-600/20 rounded-2xl mb-3 flex items-center justify-center border border-blue-500/30 shadow-xl relative overflow-hidden">
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt="Channel" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-blue-400 font-bold">{channel.name?.substring(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">{channel.name}</h2>
        <p className="text-[11px] text-blue-500 font-mono mt-0.5">#{channel.handle}</p>

        <p className="text-center text-zinc-400 mt-3 text-sm max-w-xs leading-relaxed">{channel.description || 'Welcome to the channel!'}</p>
      </div>

      <div className="flex justify-center divide-x divide-white/10 mb-6 border-y border-white/5 py-3 bg-[#0A0A0A] shrink-0">
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white">{followerCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Followers</p>
        </div>
        {channel.isPrivate && (
          <div className="px-6 text-center flex flex-col items-center justify-center">
            <Shield size={18} className="text-blue-400 mb-1" />
            <p className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">Private</p>
          </div>
        )}
      </div>

      <div className="px-5 space-y-3 pb-10">
        {!isOwner && (
          <button disabled={togglingFollow} onClick={toggleFollow} className={`w-full font-semibold rounded-2xl py-3.5 px-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 active:scale-[0.98] ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-gray-200'}`}>
            <Users size={18} />
            <span>{isFollowing ? 'Unfollow Channel' : 'Follow Channel'}</span>
          </button>
        )}

        {isOwner && (
          <button onClick={() => navigate(`/chat/${id}`)} className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 px-4 flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors active:scale-[0.98]">
            <Edit3 size={18} />
            <span>Manage Content</span>
          </button>
        )}

        <button onClick={() => navigate(`/chat/${id}`)} className="w-full bg-blue-600/10 text-blue-500 font-semibold rounded-2xl py-3.5 px-4 flex items-center justify-center space-x-2 hover:bg-blue-600/20 transition-colors active:scale-[0.98]">
          <MessageSquare size={18} />
          <span>Go to Channel Feed</span>
        </button>

        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-medium">Created</span>
            <span className="text-xs text-white">{channel.createdAt?.toDate ? format(channel.createdAt.toDate(), "MMM d, yyyy") : 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
