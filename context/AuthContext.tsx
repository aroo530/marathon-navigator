// context/AuthContext.tsx
import { supabase } from '@/constants/supabaseClient';
import { UserProfile, getUserProfile } from '@/services/userService';
import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile whenever session changes
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
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {

      if (!unsubscribed) {
        setSession(session);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!unsubscribed) {
        setSession(session);

      }
    });

    return () => {
      unsubscribed = true;
      subscription.unsubscribe();
    };
  }, []);

  // Auth methods
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      userProfile,
      isLoading,
      signUp,
      signIn,
      signOut
    }}>
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
