import { supabase } from '@/constants/supabaseClient';
import { UserProfile, getUserProfile } from '@/services/userService';
import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    };
    fetchUserProfile();
  }, [session]);

  useEffect(() => {
    let unsubscribed = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!unsubscribed) {
        setSession(session);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!unsubscribed) setSession(session);
    });

    return () => {
      unsubscribed = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut().catch(() => {});
    // Force-clear local state in case the server returned an error
    // and the client didn't fire SIGNED_OUT (e.g. 403 session_not_found)
    setSession(null);
    setUserProfile(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthProvider;
