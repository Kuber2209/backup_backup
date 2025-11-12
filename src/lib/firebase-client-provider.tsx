
'use client';

import React from 'react';
import { AuthProvider } from './auth-provider';

// This file is now redundant as AuthProvider is used directly in the root layout.
// Keeping it for historical reference or future use if needed, but it's not actively used.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
