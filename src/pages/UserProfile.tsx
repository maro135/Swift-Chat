import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ArrowLeft, User as UserIcon, Shield, MessageSquare, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [togglingFollow, setTogglingFollow] = useState(false);

  useEffect(() => {
    if (!id || !auth.currentUser) return;
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (e) {
        console.error('Error fetching user profile', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    
    const unsubFollowers = onSnapshot(collection(db, 'users', id, 'followers'), (snap) => {
      setFollowerCount(snap.size);
      setIsFollowing(snap.docs.some(d => d.id === auth.currentUser?.uid));
    });
    
    const unsubFollowing = onSnapshot(collection(db, 'users', id, 'following'), (snap) => {
      setFollowingCount(snap.size);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [id]);

  const toggleFollow = async () => {
    if (!auth.currentUser || !id || togglingFollow) return;
    setTogglingFollow(true);
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'users', id, 'followers', auth.currentUser.uid));
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'following', id));
      } else {
        await setDoc(doc(db, 'users', id, 'followers', auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'following', id), {
          targetId: id,
          createdAt: serverTimestamp()
        });
      }
    } catch(e) {
      toast.error("Error toggling follow");
    } finally {
      setTogglingFollow(false);
    }
  };

  const handleMessageUser = async () => {
    if (!auth.currentUser || !profile || !id) return;
    setMessaging(true);
    try {
      const targetUserId = id;

      const existingQ = query(
        collection(db, 'chats'),
        where('participantIds', 'array-contains', auth.currentUser.uid)
      );
      const existingSnap = await getDocs(existingQ);
      const existingChat = existingSnap.docs.find(d => d.data().type === 'direct' && (d.data().participantIds || []).includes(targetUserId));
      
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        type: 'direct',
        participantIds: [auth.currentUser.uid, targetUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        name: profile.displayName || profile.username
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

      navigate(`/chat/${chatRef.id}`);
    } catch (e) {
      console.error(e);
      toast.error('Error creating chat');
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-y-auto w-full max-w-md mx-auto relative">
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0A0A0A] z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <span className="text-white font-bold text-lg">Profile</span>
      </div>

      <div className="flex flex-col items-center mt-12 mb-8 px-6">
        <div className="w-24 h-24 bg-zinc-800 rounded-full mb-4 flex items-center justify-center border border-white/10 shadow-xl relative overflow-hidden">
           {profile.avatarUrl ? (
             <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             <UserIcon size={40} className="text-zinc-600" />
           )}
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{profile.displayName || profile.username || 'User'}</h2>
        <p className="text-[11px] text-blue-500 font-mono mt-1">@{profile.username || 'handle'}</p>
        
        {profile.isPrivate ? (
          <div className="flex items-center gap-2 mt-4 text-orange-400 bg-orange-400/10 px-4 py-1 rounded-full text-xs font-medium">
             <Shield size={14} /> This account is private
          </div>
        ) : (
          <p className="text-center text-zinc-400 mt-4 text-sm max-w-xs leading-relaxed">{profile.bio || 'This user is using Swift Chat.'}</p>
        )}
      </div>

      <div className="flex justify-center divide-x divide-white/10 mb-8 border-y border-white/5 py-4 bg-[#0A0A0A]">
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white uppercase">{followerCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Followers</p>
        </div>
        <div className="px-6 text-center">
          <p className="text-lg font-bold text-white uppercase">{followingCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Following</p>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {id !== auth.currentUser?.uid && (
          <div className="flex gap-3">
            <button disabled={togglingFollow} onClick={toggleFollow} className={`flex-1 font-semibold rounded-2xl py-3 px-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-gray-200'}`}>
              {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
              <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
            </button>
            <button disabled={messaging} onClick={handleMessageUser} className="flex-1 bg-blue-600 text-white font-semibold rounded-2xl py-3 px-4 flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50">
              <MessageSquare size={18} />
              <span>{messaging ? 'Opening...' : 'Message'}</span>
            </button>
          </div>
        )}

        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4 mt-6">
           <div className="flex justify-between items-center mb-2">
             <span className="text-xs text-gray-500 font-medium">Joined</span>
             <span className="text-xs text-white">{profile.createdAt?.toDate ? format(profile.createdAt.toDate(), "MMM d, yyyy") : 'Unknown'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
