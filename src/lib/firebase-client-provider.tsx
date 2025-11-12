
'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { AuthProvider } from '@/hooks/use-auth';
import { auth as getFirebaseAuth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (getApps().length === 0) {
        try {
          const response = await fetch('/api/firebase-config');
          if (!response.ok) {
            throw new Error('Failed to fetch Firebase config.');
          }
          const firebaseConfig: FirebaseOptions = await response.json();
          initializeApp(firebaseConfig);
          getFirebaseAuth(); // Eagerly initialize auth
        } catch (error) {
          console.error('Firebase initialization error:', error);
          // Don't render a loader here, let AuthProvider handle UI
        }
      }
      setFirebaseInitialized(true);
    };

    initialize();
  }, []);

  if (!firebaseInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
}
