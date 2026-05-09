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

  const [showingFullscreenImage, setShowingFullscreenImage] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full bg-[#050505] p-6 text-white justify-center items-center animate-in fade-in">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 hover:text-blue-400">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-y-auto w-full max-w-md mx-auto relative animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0A0A0A]/80 z-10 sticky top-0 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="text-white hover:text-blue-400 transition-colors bg-white/5 p-2 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col">
           <span className="text-white font-bold text-lg leading-tight">{profile.displayName || profile.username || 'Profile'}</span>
           <span className="text-[10px] text-zinc-500 font-medium">@{profile.username || 'handle'}</span>
        </div>
      </div>

      <div className="relative w-full h-48 bg-gradient-to-b from-blue-900/40 to-[#050505] overflow-hidden group">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 group-hover:scale-105 transition-transform duration-700"></div>
      </div>

      <div className="flex flex-col px-6 -mt-16 relative z-10">
        <div className="flex justify-between items-end mb-4">
            <div 
               onClick={() => profile.avatarUrl && setShowingFullscreenImage(true)}
               className="w-28 h-28 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-[#050505] shadow-2xl overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
               {profile.avatarUrl ? (
                 <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <UserIcon size={48} className="text-zinc-600" />
               )}
            </div>
            
            {id !== auth.currentUser?.uid && (
              <div className="flex gap-2 mb-2">
                <button disabled={messaging} onClick={handleMessageUser} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50 active:scale-95">
                  <MessageSquare size={18} />
                </button>
                <button disabled={togglingFollow} onClick={toggleFollow} className={`px-5 font-semibold rounded-full py-2 flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95 ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-gray-200'}`}>
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
              </div>
            )}
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">{profile.displayName || profile.username || 'User'}</h2>
        <p className="text-sm text-blue-400 font-medium mt-0.5">@{profile.username || 'handle'}</p>
        
        {profile.isPrivate ? (
          <div className="flex items-center gap-2 mt-4 text-orange-400 bg-orange-400/10 px-4 py-2 rounded-xl text-xs font-medium self-start">
             <Shield size={14} /> This account is private
          </div>
        ) : (
          <p className="text-zinc-300 mt-4 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio || 'This user is using Swift Chat.'}</p>
        )}
      </div>

      <div className="flex mt-6 mb-6 border-y border-white/5 py-4 bg-[#0A0A0A]">
        <div className="flex-1 px-4 text-center cursor-pointer hover:bg-white/5 transition-colors rounded-xl py-2">
          <p className="text-xl font-bold text-white">{followerCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase mt-1">Followers</p>
        </div>
        <div className="w-px bg-white/10"></div>
        <div className="flex-1 px-4 text-center cursor-pointer hover:bg-white/5 transition-colors rounded-xl py-2">
          <p className="text-xl font-bold text-white">{followingCount}</p>
          <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase mt-1">Following</p>
        </div>
      </div>

      <div className="px-6 space-y-4 pb-10">
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4">
           <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500 font-medium">Joined date</span>
             <span className="text-sm text-white font-medium">{profile.createdAt?.toDate ? format(profile.createdAt.toDate(), "MMMM yyyy") : 'Unknown'}</span>
           </div>
        </div>
      </div>

      {showingFullscreenImage && profile.avatarUrl && (
         <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setShowingFullscreenImage(false)}
         >
            <img 
               src={profile.avatarUrl} 
               className="max-w-full max-h-full object-contain animate-in zoom-in-90 duration-300" 
               alt="Full Screen View"
            />
         </div>
      )}
    </div>
  );
}
