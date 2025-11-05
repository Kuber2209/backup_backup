
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Force redirect to dashboard, bypassing login
    router.push('/dashboard');
  }, [router]);

  // Render a full-page loading indicator while the logic runs.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
       <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}
