
'use client';

import { useState } from 'react';
import type { Pitch, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { updatePitch, deletePitch } from '@/services/firestore';
import { Briefcase, Check, Edit, Mail, MoreVertical, Trash2, User as UserIcon, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog } from '@/components/ui/dialog';
import { CreatePitchForm } from './create-pitch-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PitchItemProps {
    pitch: Pitch;
    users: User[];
}

export function PitchItem({ pitch, users }: PitchItemProps) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [contactDetails, setContactDetails] = useState(pitch.contactDetails || '');

    const handleAccept = async () => {
        if (!currentUser) return;
        try {
            await updatePitch(pitch.id, { assignedTo: currentUser.id, status: 'Assigned' });
            toast({ title: 'Pitch Accepted!', description: `You are now assigned to pitch to ${pitch.companyName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not accept the pitch." });
        }
    };

    const handleMarkAsPitched = async () => {
        try {
            await updatePitch(pitch.id, { status: 'Pitched', pitchedAt: new Date().toISOString() });
            toast({ title: 'Pitch Complete!', description: `You have marked ${pitch.companyName} as pitched.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update the pitch status." });
        }
    };

    const handleUpdateContact = async () => {
        try {
            await updatePitch(pitch.id, { contactDetails });
            toast({ title: 'Contact Details Updated!' });
            setIsEditingContact(false);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update contact details." });
        }
    };

    const canAccept = currentUser?.role === 'Associate' && pitch.status === 'Open';
    const isAssignedToCurrentUser = pitch.assignedTo === currentUser?.id;
    const canManage = currentUser?.role === 'SPT' || currentUser?.role === 'JPT';

    const assignedUser = users.find(u => u.id === pitch.assignedTo);
    const createdBy = users.find(u => u.id === pitch.createdBy);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <Briefcase className='w-5 h-5' /> {pitch.companyName}
                    </CardTitle>
                    {canManage && <PitchActions pitch={pitch} />}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {isEditingContact && isAssignedToCurrentUser ? (
                     <div className="space-y-2">
                        <Label htmlFor='contact-details-edit'>Contact Details</Label>
                        <Textarea 
                            id='contact-details-edit'
                            value={contactDetails}
                            onChange={(e) => setContactDetails(e.target.value)}
                            placeholder="e.g., John Doe - HR, john.doe@example.com"
                        />
                        <div className='flex gap-2'>
                            <Button size="sm" onClick={handleUpdateContact}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingContact(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    pitch.contactDetails ? (
                        <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md whitespace-pre-wrap flex justify-between items-start">
                           <span className='flex-grow'>{pitch.contactDetails}</span>
                           {isAssignedToCurrentUser && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingContact(true)}><Edit className='h-3 w-3'/></Button>}
                        </p>
                    ) : (
                        isAssignedToCurrentUser ? (
                            <Button variant="outline" size="sm" onClick={() => setIsEditingContact(true)}>+ Add Contact Details</Button>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No contact details provided yet.</p>
                        )
                    )
                )}
               
                {pitch.otherDetails && <p className="text-sm text-muted-foreground italic">"{pitch.otherDetails}"</p>}
                
                {createdBy && <p className="text-xs text-muted-foreground">Added by {createdBy.name}</p>}

            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 pt-4 mt-auto border-t">
                {assignedUser && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={assignedUser.avatar} alt={assignedUser.name} />
                            <AvatarFallback>{assignedUser.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-semibold">Assigned to {assignedUser.id === currentUser?.id ? 'You' : assignedUser.name}</p>
                            <p className="text-xs text-muted-foreground">{assignedUser.role}</p>
                        </div>
                    </div>
                )}
                 <div className="w-full pt-4 border-t flex flex-col gap-2">
                    {canAccept && <Button onClick={handleAccept} className="w-full btn-bounce">Accept Pitch</Button>}
                    {isAssignedToCurrentUser && pitch.status === 'Assigned' && (
                        <Button onClick={handleMarkAsPitched} className="w-full btn-bounce"><Check className="mr-2 h-4 w-4" />Mark as Pitched</Button>
                    )}
                    {pitch.status === 'Pitched' && (
                        <p className='text-sm text-center font-semibold text-green-600'>Pitched!</p>
                    )}
                 </div>
            </CardFooter>
        </Card>
    );
}

function PitchActions({ pitch }: { pitch: Pitch }) {
    const [editOpen, setEditOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deletePitch(pitch.id);
            toast({ title: "Pitch Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the pitch." });
        }
    }
    
    return (
        <>
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>

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
             <Dialog open={editOpen} onOpenChange={setEditOpen}>
               {editOpen && <CreatePitchForm isEdit pitch={pitch} onFormOpenChange={setEditOpen} />}
            </Dialog>
        </>
    )
}
