
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
            <PitchListTable lists={openPitches} users={users} />
            {openPitches.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded-lg">
                    No new pitch lists are available right now.
                </div>
            )}
          </div>
        )}

        {(currentUser.role === 'JPT' || currentUser.role === 'SPT') && (
            <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full" defaultValue='open-pitches'>
                    <AccordionItem value="open-pitches">
                        <AccordionTrigger className="text-lg font-semibold">Open Pitch Lists ({openPitches.length})</AccordionTrigger>
                        <AccordionContent className="pt-4">
                           <PitchListTable lists={openPitches} users={users} />
                           {openPitches.length === 0 && <p className="text-muted-foreground col-span-full text-center pt-4">No open pitch lists.</p>}
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


function PitchListTable({ lists, users }: { lists: PitchList[]; users: User[] }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const handleAccept = async (list: PitchList) => {
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
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>List Title</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lists.map(list => {
                        const creator = users.find(u => u.id === list.createdBy);
                        return (
                            <TableRow key={list.id}>
                                <TableCell className="font-medium">{list.title}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={creator?.avatar} />
                                            <AvatarFallback>{creator?.name.slice(0,1)}</AvatarFallback>
                                        </Avatar>
                                        <span>{creator?.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{formatDistanceToNow(new Date(list.createdAt), { addSuffix: true })}</TableCell>
                                <TableCell><Badge variant="outline">{list.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    {list.status === 'Open' && currentUser?.role === 'Associate' && (
                                        <Button size="sm" onClick={() => handleAccept(list)}>Accept List</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    );
}
