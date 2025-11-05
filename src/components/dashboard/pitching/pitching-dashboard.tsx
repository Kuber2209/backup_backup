
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getPitches, getUsers, createPitch } from '@/services/firestore';
import type { Pitch, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PitchItem } from './pitch-item';
import { CreatePitchForm } from './create-pitch-form';

export function PitchingDashboard() {
  const { user: currentUser } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    
    const unsubscribePitches = getPitches((allPitches) => {
        setPitches(allPitches);
        getUsers().then(allUsers => {
            setUsers(allUsers);
            setLoading(false);
        });
    });

    return () => unsubscribePitches();

  }, [currentUser]);

  const { availablePitches, myPitches } = useMemo(() => {
    if (!currentUser) return { availablePitches: [], myPitches: [] };
    return {
        availablePitches: pitches.filter(p => p.status === 'Open'),
        myPitches: pitches.filter(p => p.assignedTo === currentUser.id)
    }
  }, [pitches, currentUser]);
  
  const canManage = currentUser?.role === 'SPT' || currentUser?.role === 'JPT';
  
  if (loading) {
      return (
          <div>
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-64" />
                {canManage && <Skeleton className="h-10 w-36" />}
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-60 w-full" />
                <Skeleton className="h-60 w-full" />
             </div>
          </div>
      )
  }

  return (
    <div>
        <div className="flex items-center justify-between border-b border-t py-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold font-headline tracking-tight">Pitching Opportunities</h2>
                <p className="text-muted-foreground">Find and accept companies to pitch to.</p>
            </div>
            {canManage && <CreatePitchForm />}
        </div>
        
        {currentUser?.role === 'Associate' && myPitches.length > 0 && (
            <div className='mb-8'>
                <h3 className="text-xl font-bold font-headline mb-4">My Assigned Pitches ({myPitches.length})</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {myPitches.map(pitch => <PitchItem key={pitch.id} pitch={pitch} users={users} />)}
                </div>
            </div>
        )}

        <div>
            <h3 className="text-xl font-bold font-headline mb-4">Available Companies ({availablePitches.length})</h3>
            {availablePitches.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {availablePitches.map(pitch => <PitchItem key={pitch.id} pitch={pitch} users={users} />)}
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-48 bg-card">
                    <h3 className="text-xl font-bold tracking-tight font-headline">All Companies Assigned</h3>
                    <p className="text-sm text-muted-foreground">Great work team! Check back later for new opportunities.</p>
                </div>
            )}
        </div>
    </div>
  );
}
