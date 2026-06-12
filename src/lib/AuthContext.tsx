'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isConfigured, getUserProfile, UserProfile } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isFirebaseReady: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If Firebase is not configured, don't crash — just stop loading
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);

        if (pathname === '/auth' || pathname === '/') {
          if (userProfile) {
            if (userProfile.role === 'teacher') {
              router.push('/teacher/dashboard');
            } else if (userProfile.role === 'student') {
              router.push('/student/dashboard');
            }
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        if (pathname.startsWith('/teacher') || pathname.startsWith('/student')) {
          router.push('/auth');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth) {
      alert('Firebase is not configured yet. Please add your API keys to the .env.local file.');
      return;
    }
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const userProfile = await getUserProfile(result.user.uid);
      if (userProfile) {
        setProfile(userProfile);
        if (userProfile.role === 'teacher') {
          router.push('/teacher/dashboard');
        } else if (userProfile.role === 'student') {
          router.push('/student/dashboard');
        } else {
          router.push('/auth');
        }
      } else {
        router.push('/auth');
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      alert('Sign-in failed. Please check your Firebase configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      if (auth) {
        await firebaseSignOut(auth);
      }
      router.push('/');
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  // Protected route handling
  useEffect(() => {
    if (!loading) {
      if (!user && (pathname.startsWith('/teacher') || pathname.startsWith('/student'))) {
        router.push('/auth');
      } else if (user && profile) {
        if (pathname.startsWith('/teacher') && profile.role !== 'teacher') {
          router.push('/student/dashboard');
        } else if (pathname.startsWith('/student') && profile.role !== 'student') {
          router.push('/teacher/dashboard');
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isFirebaseReady: !!isConfigured,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
