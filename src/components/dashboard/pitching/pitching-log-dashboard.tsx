
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPitches, getUsers } from '@/services/firestore';
import type { Pitch, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const statusStyles: { [key: string]: string } = {
  'Open': 'bg-primary/10 text-primary border-primary/20',
  'Assigned': 'bg-accent/10 text-accent border-accent/20',
  'Pitched': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function PitchingLogDashboard() {
  const { user: currentUser } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribePitches = getPitches((allPitches) => {
        setPitches(allPitches);
        getUsers().then(allUsers => {
            setUsers(allUsers);
            setLoading(false);
        });
    });

    return () => unsubscribePitches();
  }, []);

  if (loading) {
      return (
           <div>
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-12 w-full mb-6" />
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
      );
  }

  if (currentUser?.role === 'Associate') {
    return null;
  }

  return (
    <div>
        <div className="mb-4">
            <h2 className="text-2xl font-bold font-headline tracking-tight">Pitching Log</h2>
            <p className="text-muted-foreground">Monitor the status of all company pitches.</p>
        </div>
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pitches.map(pitch => {
                        const assignedUser = users.find(u => u.id === pitch.assignedTo);
                        const createdByUser = users.find(u => u.id === pitch.createdBy);
                        return (
                            <TableRow key={pitch.id}>
                                <TableCell className="font-medium">{pitch.companyName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(statusStyles[pitch.status])}>
                                        {pitch.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {assignedUser ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={assignedUser.avatar} />
                                                <AvatarFallback>{assignedUser.name.slice(0, 1)}</AvatarFallback>
                                            </Avatar>
                                            <span>{assignedUser.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic">Unassigned</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                     {createdByUser ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={createdByUser.avatar} />
                                                <AvatarFallback>{createdByUser.name.slice(0, 1)}</AvatarFallback>
                                            </Avatar>
                                            <span>{createdByUser.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic">Unknown</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                    <p>Created: {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}</p>
                                    {pitch.pitchedAt && <p>Pitched: {formatDistanceToNow(new Date(pitch.pitchedAt), { addSuffix: true })}</p>}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
             {pitches.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    No pitches have been created yet.
                </div>
            )}
        </div>
    </div>
  );
}
