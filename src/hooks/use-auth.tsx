

'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser} from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
    toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: `The email ${email} is on the blacklist.`,
        duration: 5000,
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          
          if (fbUser.email && await isEmailBlacklisted(fbUser.email) && fbUser.email !== ADMIN_EMAIL) {
            await handleBlacklistedAccess(fbUser.email);
            router.push('/access-declined');
            return;
          }

          let userProfile = await getUserProfile(fbUser.uid);

          if (userProfile) {
            // Existing user
            if (userProfile.status === 'pending' && userProfile.email !== ADMIN_EMAIL) {
              setUser(userProfile);
              router.push('/pending-approval');
            } else if (userProfile.status === 'declined') {
               await signOut(auth);
               router.push('/access-declined');
            } else {
               // Active, undefined status, or admin email is allowed
               setUser(userProfile);
            }
          } else {
             // This is a new user
             if (!fbUser.email) {
                // This case should ideally not happen for a new user if email is required for signup.
                // Log out to be safe.
                await signOut(auth);
                return;
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
                notificationTokens: [], // Initialize with an empty array
            };
            await createUserProfile(newUser);
            setUser(newUser);
            
            if (newUser.status === 'pending') {
                router.push('/pending-approval');
            }
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error: any) {
        console.error("onAuthStateChanged: Error processing auth state:", error);
        // Handle offline error gracefully
        if (error.code === 'unavailable') {
            toast({
                variant: 'destructive',
                title: 'Network Error',
                description: 'Could not connect to the database. Please check your internet connection and try again.'
            });
            await signOut(auth); // Log the user out so they can retry
        } else {
            toast({variant: 'destructive', title: 'Authentication Error', description: 'Could not verify user status.'});
        }
        setUser(null); 
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const logIn = async (email: string, pass: string) => {
     if (await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This email is on the blacklist.',
        });
        throw new Error("Email is blacklisted");
    }
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUp = async (email: string, pass:string, name: string) => {
    if (await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This email is on the blacklist.',
        });
        throw new Error("Email is blacklisted");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    // Explicitly create profile here instead of only relying on onAuthStateChanged
    // to avoid race conditions on initial sign-up.
    const isWhitelisted = await isEmailWhitelisted(fbUser.email!);
    const isAdmin = fbUser.email === ADMIN_EMAIL;

    const newUser: User = {
        id: fbUser.uid,
        name: name, // Use the name from the form
        email: fbUser.email!,
        role: isAdmin ? 'SPT' : 'Associate', 
        avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
        isOnHoliday: false,
        status: isAdmin || isWhitelisted ? 'active' : 'pending',
        notificationTokens: [],
    };
    await createUserProfile(newUser);
    setUser(newUser); // Manually set user to update UI state immediately
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
     if (email && await isEmailBlacklisted(email) && email !== ADMIN_EMAIL) {
        await handleBlacklistedAccess(email);
        throw new Error("Email is blacklisted");
    }
    // `onAuthStateChanged` will handle profile creation and redirection.
    return result;
  }

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    // Don't push to login here, allow the root page handler to do it.
    // This prevents race conditions.
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
