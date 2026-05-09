import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Login() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Handle redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in via redirect
          console.log("Redirect login success");
        }
      } catch (error: any) {
        console.error("Redirect Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          toast.error("هذا النطاق (Domain) غير مصرح به في Firebase.");
        }
      }
    };
    checkRedirect();
  }, []);

  if (user) {
    return <Navigate to="/chats" replace />;
  }

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      // Try popup first
      await signInWithPopup(auth, provider);
    } catch (error: any) {
       console.error("Login Error:", error);
       
       if (error.code === 'auth/unauthorized-domain') {
         toast.error("هذا الدومين غير مصرح به في Firebase. يرجى إضافة رابط Vercel إلى Authorized Domains.");
       } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
         toast.info("جاري تحويلك لتسجيل الدخول...");
         try {
           const provider = new GoogleAuthProvider();
           await signInWithRedirect(auth, provider);
         } catch (e) {
           console.error("Redirect fallback error", e);
         }
       } else {
         toast.error("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
       }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col p-6 items-center justify-center font-sans text-right">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,99,235,0.4)]">
          <MessageCircle size={32} className="text-white fill-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Swift Chat</h1>
        <p className="text-gray-400 text-center mb-10 text-sm">
          منصة مراسلة عصرية خفيفة الوزن للمستقبل.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-semibold rounded-xl py-3.5 px-4 flex items-center justify-center space-x-3 hover:bg-gray-100 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5 ml-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span>{loading ? 'جاري التحميل...' : 'تسجيل الدخول بواسطة Google'}</span>
        </button>
        
        <p className="mt-8 text-xs text-zinc-500 text-center px-4 leading-relaxed">
          بتسجيل دخولك، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.
        </p>
      </div>
    </div>
  );
}
