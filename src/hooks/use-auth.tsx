

'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser} from 'firebase/auth';
import { auth, firebaseInitialization } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { createUserProfile, getUserProfile, isEmailBlacklisted, isEmailWhitelisted } from '@/services/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'f20240819@hyderabad.bits-pilani.ac.in';

const handleBlacklistedAccess = async (email: string | null) => {
    if (!email) return;
    await signOut(auth);
};

// This function handles the entire user session logic after Firebase auth state changes.
const manageUserSession = async (fbUser: FirebaseUser): Promise<{ userProfile: User | null; route?: string }> => {
    if (fbUser.email && await isEmailBlacklisted(fbUser.email) && fbUser.email !== ADMIN_EMAIL) {
        await handleBlacklistedAccess(fbUser.email);
        return { userProfile: null, route: '/access-declined' };
    }

    // Attempt to get the existing user profile.
    let userProfile = await getUserProfile(fbUser.uid);

    // If no profile exists, it's a new user. Create their profile.
    if (!userProfile) {
        if (!fbUser.email) { // Should not happen with providers used, but a good safeguard.
            await signOut(auth);
            throw new Error("User has no email for profile creation.");
        }

        const isWhitelisted = await isEmailWhitelisted(fbUser.email);
        const isAdmin = fbUser.email === ADMIN_EMAIL;
        
        const newUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'New User',
            email: fbUser.email,
            role: isAdmin ? 'SPT' : 'Associate',
            avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
            isOnHoliday: false,
            status: isAdmin || isWhitelisted ? 'active' : 'pending',
        };
        
        await createUserProfile(newUser);
        userProfile = newUser;
    }

    // Determine routing based on user status.
    if (userProfile.status === 'pending' && userProfile.email !== ADMIN_EMAIL) {
        return { userProfile, route: '/pending-approval' };
    }
    if (userProfile.status === 'declined') {
        await signOut(auth);
        return { userProfile: null, route: '/access-declined' };
    }
    
    // For active users, no specific route is needed.
    return { userProfile };
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      await firebaseInitialization; // Wait for firebase to be initialized
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setLoading(true);
        if (fbUser) {
          try {
              setFirebaseUser(fbUser);
              const { userProfile, route } = await manageUserSession(fbUser);
              setUser(userProfile);
              if (route) {
                  router.push(route);
              }
          } catch (error: any) {
              console.error("onAuthStateChanged Error:", error);
              toast({
                  variant: 'destructive',
                  title: 'Login Failed',
                  description: 'Could not connect to the database. Please check your internet connection and try again.'
              });
              await signOut(auth);
              setUser(null);
              setFirebaseUser(null);
          } finally {
              setLoading(false);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
          setLoading(false);
        }
      });
      return unsubscribe;
    };
    
    let unsubscribe: (() => void) | undefined;
    initAuth().then(unsub => {
        if(unsub) unsubscribe = unsub;
    });

    return () => {
        if(unsubscribe) unsubscribe();
    }
  }, [router]);

  const logIn = async (email: string, pass: string) => {
     if (await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
        throw new Error("This email has been blacklisted.");
    }
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUp = async (email: string, pass:string, name: string) => {
    if (await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
        throw new Error("This email has been blacklisted and cannot be used to sign up.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged listener will handle profile creation.
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const email = result.user.email;
        if (email && await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
            await handleBlacklistedAccess(email);
            throw new Error("This email has been blacklisted.");
        }
        // `onAuthStateChanged` will handle profile creation and redirection.
        return result;
    } catch(err: any) {
        // Rethrow the error to be caught by the UI
        throw err;
    }
  }

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };


  const value = {
    user,
    setUser,
    firebaseUser,
    loading,
    logIn,
    signUp,
    signInWithGoogle,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
