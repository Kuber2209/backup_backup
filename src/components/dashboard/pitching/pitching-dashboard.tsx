'use client';

import { useState, useEffect } from 'react';
import type { PitchList, User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getPitchLists, getUsers } from '@/services/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePitchListForm } from './create-pitch-list-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { updatePitchList } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { MyPitches } from './my-pitches';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function PitchingDashboard() {
  const { user: currentUser } = useAuth();
  const [pitchLists, setPitchLists] = useState<PitchList[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = getPitchLists((data) => {
      setPitchLists(data);
      getUsers().then(setUsers).finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) return null;

  const canManage = currentUser.role === 'SPT' || currentUser.role === 'JPT';

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
          {canManage && <Skeleton className="h-10 w-44" />}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const myPitches = pitchLists.filter(list => list.assignedTo === currentUser.id);
  const openPitches = pitchLists.filter(list => list.status === 'Open');
  const allAssignedPitches = pitchLists.filter(list => list.status === 'Assigned');

  return (
    <div>
      <div className="flex items-center justify-between border-b border-t py-4">
        <div>
          <h2 className="text-2xl font-bold font-headline tracking-tight">Pitching Database</h2>
          <p className="text-muted-foreground">Manage company contact lists for pitching.</p>
        </div>
        {canManage && <CreatePitchListForm users={users} />}
      </div>

      <div className="mt-6 space-y-8">
        {currentUser.role === 'Associate' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-headline">My Pitches</h3>
            <MyPitches pitchLists={myPitches} users={users} />
            <h3 className="text-xl font-bold font-headline pt-4">Available for acceptance</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openPitches.map(list => (
                <PitchListCard key={list.id} list={list} users={users} />
              ))}
            </div>
            {openPitches.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded-lg">
                    No new pitch lists are available right now.
                </div>
            )}
          </div>
        )}

        {(currentUser.role === 'JPT' || currentUser.role === 'SPT') && (
            <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="open-pitches">
                        <AccordionTrigger className="text-lg font-semibold">Open Pitch Lists ({openPitches.length})</AccordionTrigger>
                        <AccordionContent>
                           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                                {openPitches.map(list => <PitchListCard key={list.id} list={list} users={users} />)}
                                {openPitches.length === 0 && <p className="text-muted-foreground col-span-full text-center">No open pitch lists.</p>}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="assigned-pitches">
                        <AccordionTrigger className="text-lg font-semibold">Assigned Pitch Lists ({allAssignedPitches.length})</AccordionTrigger>
                        <AccordionContent>
                            <MyPitches pitchLists={allAssignedPitches} users={users} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        )}
      </div>
    </div>
  );
}

function PitchListCard({ list, users }: { list: PitchList; users: User[] }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const creator = users.find(u => u.id === list.createdBy);

    const handleAccept = async () => {
        if (!currentUser) return;
        try {
            await updatePitchList(list.id, {
                assignedTo: currentUser.id,
                status: 'Assigned',
            });
            toast({ title: "Pitch List Accepted!", description: "You can now manage this list under 'My Pitches'."})
        } catch(e) {
            toast({ variant: 'destructive', title: "Error", description: "Could not accept the pitch list."})
        }
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{list.title}</CardTitle>
                {creator && (
                    <CardDescription className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={creator.avatar} />
                            <AvatarFallback>{creator.name.slice(0,2)}</AvatarFallback>
                        </Avatar>
                        <span>Created by {creator.name} {formatDistanceToNow(new Date(list.createdAt), {addSuffix: true})}</span>
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-grow">
                 <Badge variant="outline">{list.status}</Badge>
            </CardContent>
            <CardFooter>
                {list.status === 'Open' && currentUser?.role === 'Associate' && (
                    <Button className="w-full" onClick={handleAccept}>Accept List</Button>
                )}
                 {list.status === 'Assigned' && (
                    <p className="text-sm text-muted-foreground">This list is already assigned.</p>
                )}
            </CardFooter>
        </Card>
    )
}
