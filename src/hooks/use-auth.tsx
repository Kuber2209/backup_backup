

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
};

// Helper function to pause execution, useful for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches the user profile from Firestore. If the user doesn't exist, it creates a new one.
 * Includes a retry mechanism to handle transient network issues on initial load.
 */
async function fetchUserProfileWithRetry(fbUser: FirebaseUser, retries = 3, delay = 2000): Promise<User | null | 'blacklisted'> {
    for (let i = 0; i < retries; i++) {
        try {
            // Check for blacklisted status on every attempt
            if (fbUser.email && await isEmailBlacklisted(fbUser.email) && fbUser.email !== ADMIN_EMAIL) {
                await handleBlacklistedAccess(fbUser.email);
                return 'blacklisted';
            }

            let userProfile = await getUserProfile(fbUser.uid);

            if (userProfile) {
                return userProfile; // User profile found, return it.
            }

            // --- New User Creation Flow ---
            if (!fbUser.email) { // Should not happen with providers used
                await signOut(auth);
                return null;
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
            return newUser; // Return the newly created user.

        } catch (error: any) {
            // Only retry on the specific 'unavailable' (offline) error code from Firestore.
            if (error.code === 'unavailable' && i < retries - 1) {
                console.warn(`Firestore offline, attempt ${i + 1} of ${retries}. Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                // For any other error, or on the final retry attempt, throw the error to be caught by the calling function.
                console.error("Failed to fetch or create user profile after multiple retries:", error);
                throw error; 
            }
        }
    }
    return null; // Should be unreachable if retries > 0
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
            setFirebaseUser(fbUser);
            const userProfile = await fetchUserProfileWithRetry(fbUser);
            
            if (userProfile === 'blacklisted') {
                router.push('/access-declined');
            } else if (userProfile) {
                 if (userProfile.status === 'pending' && userProfile.email !== ADMIN_EMAIL) {
                    setUser(userProfile);
                    router.push('/pending-approval');
                } else if (userProfile.status === 'declined') {
                    await signOut(auth);
                    router.push('/access-declined');
                } else {
                    setUser(userProfile);
                }
            } else {
                // This case handles a null return from the retry function, which implies a failure.
                await signOut(auth);
                 setUser(null);
                 setFirebaseUser(null);
            }
        } catch (error: any) {
            // This block catches the final error thrown by fetchUserProfileWithRetry
            console.error("onAuthStateChanged: Final error after retries:", error);
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

    return () => unsubscribe();
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
