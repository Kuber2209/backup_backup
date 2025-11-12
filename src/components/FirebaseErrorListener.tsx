
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from './ui/use-toast';


// This is a client-side component that will listen for Firestore permission errors
// and display them using the Next.js error overlay in development.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        // In development, we want the big, ugly, unmissable error overlay.
        // Throwing the error here will trigger it.
        throw error;
      } else {
        // In production, we show a friendly toast notification.
        console.error(error); // Also log it for observability
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything.
}
