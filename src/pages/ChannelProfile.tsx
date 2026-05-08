import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, serverTimestamp, deleteDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ArrowLeft, Hash, Users, Trash2, Edit3, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export function ChannelProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [togglingFollow, setTogglingFollow] = useState(false);

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
    } catch(e) {
      alert("Error toggling follow");
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
      } catch(e) {
        alert("Error deleting channel");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center">
        <h2 className="text-xl font-bold">Channel Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500">Go Back</button>
      </div>
    );
  }

  const isOwner = channel.ownerId === auth.currentUser?.uid;

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-y-auto w-full max-w-md mx-auto relative">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0A0A0A] z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <span className="text-white font-bold text-lg">Channel Profile</span>
        </div>
        {isOwner && (
          <button onClick={deleteChannel} className="text-red-500 hover:text-red-400 transition-colors p-2 bg-red-500/10 rounded-full">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center mt-12 mb-8 px-6">
        <div className="w-24 h-24 bg-blue-600/20 rounded-3xl mb-4 flex items-center justify-center border border-blue-500/30 shadow-xl relative overflow-hidden">
           {channel.avatarUrl ? (
             <img src={channel.avatarUrl} alt="Channel" className="w-full h-full object-cover" />
           ) : (
             <span className="text-4xl text-blue-400 font-bold">{channel.name?.substring(0, 1).toUpperCase()}</span>
           )}
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{channel.name}</h2>
        <p className="text-[11px] text-blue-500 font-mono mt-1 w-full text-center">#{channel.handle}</p>
        
        <p className="text-center text-zinc-400 mt-4 text-sm max-w-xs leading-relaxed">{channel.description || 'Welcome to the channel!'}</p>
      </div>

      <div className="flex justify-center divide-x divide-white/10 mb-8 border-y border-white/5 py-4 bg-[#0A0A0A]">
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white uppercase">{followerCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Followers</p>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {!isOwner && (
          <button disabled={togglingFollow} onClick={toggleFollow} className={`w-full font-semibold rounded-2xl py-4 px-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-gray-200'}`}>
            <Users size={18} />
            <span>{isFollowing ? 'Unfollow Channel' : 'Follow Channel'}</span>
          </button>
        )}

        {isOwner && (
          <button onClick={() => navigate(`/chat/${id}`)} className="w-full bg-white text-black font-semibold rounded-2xl py-4 px-4 flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors">
            <Edit3 size={18} />
            <span>Manage Channel</span>
          </button>
        )}

        <button onClick={() => navigate(`/chat/${id}`)} className="w-full bg-blue-600 text-white font-semibold rounded-2xl py-4 px-4 flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 mt-2">
          <MessageSquare size={18} />
          <span>Go to Channel</span>
        </button>

        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4 mt-6">
           <div className="flex justify-between items-center mb-2">
             <span className="text-xs text-gray-500 font-medium">Created</span>
             <span className="text-xs text-white">{channel.createdAt?.toDate ? format(channel.createdAt.toDate(), "MMM d, yyyy") : 'Unknown'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
