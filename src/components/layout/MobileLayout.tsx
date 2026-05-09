import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, Users, Hash, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export function MobileLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs = [
    { name: 'Chats', path: '/chats', icon: MessageCircle },
    { name: 'Groups', path: '/groups', icon: Users },
    { name: 'Channels', path: '/channels', icon: Hash },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const currentTab = tabs.find(tab => location.pathname.startsWith(tab.path)) || tabs[0];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#F5F5F5] overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between z-10 sticky top-0">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
             <span className="font-bold text-sm tracking-tighter italic text-white">SC</span>
           </div>
           <h1 className="text-xl font-semibold tracking-tight text-white">{currentTab?.name}</h1>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative z-0">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-[#0A0A0A] border-t border-white/5 pb-safe z-10">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.path);
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {isActive && (
                   <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-xl" transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
                )}
                <Icon size={20} className={cn("relative z-10", isActive && "text-blue-500")} />
                <span className="relative z-10 text-[10px] font-bold uppercase tracking-tighter">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
