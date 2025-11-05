
'use client';

import { useState } from 'react';
import type { Pitch, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { updatePitch, deletePitch } from '@/services/firestore';
import { Briefcase, Check, Edit, Mail, MoreVertical, Phone, Trash2, User as UserIcon, X, Save } from 'lucide-react';
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
    
    const [hrName, setHrName] = useState(pitch.hrName || '');
    const [hrEmail, setHrEmail] = useState(pitch.hrEmail || '');
    const [hrPhone, setHrPhone] = useState(pitch.hrPhone || '');

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
            await updatePitch(pitch.id, { hrName, hrEmail, hrPhone });
            toast({ title: 'Contact Details Updated!' });
            setIsEditingContact(false);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update contact details." });
        }
    };
    
    const cancelEdit = () => {
        setHrName(pitch.hrName || '');
        setHrEmail(pitch.hrEmail || '');
        setHrPhone(pitch.hrPhone || '');
        setIsEditingContact(false);
    }

    const canAccept = currentUser?.role === 'Associate' && pitch.status === 'Open';
    const isAssignedToCurrentUser = pitch.assignedTo === currentUser?.id;
    const canManage = currentUser?.role === 'SPT' || currentUser?.role === 'JPT';
    const canEdit = currentUser != null; // Any logged-in user can edit

    const assignedUser = users.find(u => u.id === pitch.assignedTo);
    const createdBy = users.find(u => u.id === pitch.createdBy);
    const hasContactInfo = pitch.hrName || pitch.hrEmail || pitch.hrPhone;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <Briefcase className='w-5 h-5' /> {pitch.companyName}
                    </CardTitle>
                    <PitchActions pitch={pitch} canManage={canManage} canEdit={canEdit} />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {isEditingContact && canEdit ? (
                     <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-2">
                            <Label htmlFor='hrName-edit' className="text-xs">HR Name</Label>
                            <Input id='hrName-edit' value={hrName} onChange={(e) => setHrName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='hrEmail-edit' className="text-xs">HR Email</Label>
                            <Input id='hrEmail-edit' type="email" value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} placeholder="hr@example.com"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='hrPhone-edit' className="text-xs">HR Phone</Label>
                            <Input id='hrPhone-edit' value={hrPhone} onChange={(e) => setHrPhone(e.target.value)} placeholder="+91..." />
                        </div>
                        <div className='flex gap-2'>
                            <Button size="sm" onClick={handleUpdateContact}><Save className="mr-2 h-4 w-4"/>Save</Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 relative group">
                       {canEdit && (
                         <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingContact(true)}>
                           <Edit className='h-4 w-4'/>
                         </Button>
                       )}
                        {hasContactInfo ? (
                            <>
                                {pitch.hrName && <p className="text-sm font-medium flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground"/> {pitch.hrName}</p>}
                                {pitch.hrEmail && <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4"/> {pitch.hrEmail}</p>}
                                {pitch.hrPhone && <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4"/> {pitch.hrPhone}</p>}
                            </>
                        ) : (
                           <p className="text-sm text-center text-muted-foreground italic py-2">No contact details yet. {canEdit ? "Click edit to add." : ""}</p>
                        )}
                    </div>
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

function PitchActions({ pitch, canManage, canEdit }: { pitch: Pitch, canManage: boolean, canEdit: boolean }) {
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
