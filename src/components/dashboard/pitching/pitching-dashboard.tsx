
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getPitches, getUsers, updatePitch, deletePitch } from '@/services/firestore';
import type { Pitch, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PitchItem } from './pitch-item';
import { CreatePitchForm } from './create-pitch-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Edit, Mail, MoreVertical, Phone, Trash2, User as UserIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
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
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {availablePitches.map(pitch => 
                                <AvailablePitchRow key={pitch.id} pitch={pitch} currentUser={currentUser!} />
                            )}
                        </TableBody>
                    </Table>
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

function AvailablePitchRow({ pitch, currentUser }: { pitch: Pitch, currentUser: User }) {
    const { toast } = useToast();
    const [editOpen, setEditOpen] = useState(false);

    const handleAccept = async () => {
        try {
            await updatePitch(pitch.id, { assignedTo: currentUser.id, status: 'Assigned' });
            toast({ title: 'Pitch Accepted!', description: `You are now assigned to pitch to ${pitch.companyName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not accept the pitch." });
        }
    };
    
    const handleDelete = async () => {
        try {
            await deletePitch(pitch.id);
            toast({ title: "Pitch Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the pitch." });
        }
    }


    const canAccept = currentUser?.role === 'Associate';
    const canManage = currentUser?.role === 'SPT' || currentUser?.role === 'JPT';
    const canEdit = currentUser != null;

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium flex items-center gap-2">
                   <Briefcase className="w-4 h-4 text-muted-foreground" /> {pitch.companyName}
                </div>
            </TableCell>
            <TableCell>
                 <div className="space-y-1 text-sm">
                    {pitch.hrName && <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground"/> {pitch.hrName}</p>}
                    {pitch.hrEmail && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground"/> {pitch.hrEmail}</p>}
                    {pitch.hrPhone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground"/> {pitch.hrPhone}</p>}
                    {!pitch.hrName && !pitch.hrEmail && !pitch.hrPhone && (
                        <p className="text-muted-foreground italic">No contact details</p>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <p className="text-sm text-muted-foreground max-w-xs truncate">{pitch.otherDetails || '-'}</p>
            </TableCell>
            <TableCell className="text-right">
                <div className='flex items-center justify-end gap-2'>
                    {canAccept && <Button onClick={handleAccept} size="sm">Accept</Button>}
                    <AlertDialog>
                       <Dialog open={editOpen} onOpenChange={setEditOpen}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {canEdit && (
                                        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                    )}
                                    {canManage && (
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                             {editOpen && <CreatePitchForm isEdit pitch={pitch} onFormOpenChange={setEditOpen} />}
                        </Dialog>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the pitch for {pitch.companyName}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TableCell>
        </TableRow>
    )
}
