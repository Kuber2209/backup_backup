
'use client';

import { useState, useEffect } from 'react';
import type { PitchList, PitchContact, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getContactsForPitchList, updatePitchContact } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

function EditableCell({ value, onSave }: { value: string | undefined; onSave: (value: string) => void }) {
    const [localValue, setLocalValue] = useState(value || '');
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        onSave(localValue);
        setIsEditing(false);
    }
    
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    if (isEditing) {
        return (
            <Input 
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); handleSave(); } }}
                autoFocus
                className="h-8"
            />
        )
    }

    return (
        <div onClick={() => setIsEditing(true)} className="min-h-[32px] w-full p-1.5 cursor-pointer rounded-md hover:bg-muted text-sm">
            {value || <span className="text-muted-foreground text-xs italic">empty</span>}
        </div>
    )
}

export function MyPitches({ pitchLists, users }: { pitchLists: PitchList[], users: User[] }) {
  if (pitchLists.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 border rounded-lg">
        You have no assigned pitch lists.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {pitchLists.map(list => {
        const assignedUser = users.find(u => u.id === list.assignedTo);
        const creatorUser = users.find(u => u.id === list.createdBy);
        return (
            <AccordionItem value={list.id} key={list.id} className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                        <div className="text-left">
                            <h4 className="font-semibold text-lg">{list.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {creatorUser && <span className="flex items-center gap-1">Created by {creatorUser.name}</span>}
                                {assignedUser && <span className="flex items-center gap-1">Assigned to {assignedUser.name}</span>}
                            </div>
                        </div>
                         <Badge variant="secondary">{list.status}</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                    <PitchContactsTable pitchListId={list.id} />
                </AccordionContent>
            </AccordionItem>
        )
      })}
    </Accordion>
  );
}

function PitchContactsTable({ pitchListId }: { pitchListId: string }) {
  const [contacts, setContacts] = useState<PitchContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getContactsForPitchList(pitchListId, (data) => {
      setContacts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [pitchListId]);
  
  const handleUpdate = (contactId: string, field: keyof Omit<PitchContact, 'id'>, value: string) => {
    // Optimistic UI update
    const updatedContacts = contacts.map(c => c.id === contactId ? {...c, [field]: value} : c);
    setContacts(updatedContacts);
    
    // Debounce Firestore write
    const timer = setTimeout(() => {
        updatePitchContact(pitchListId, contactId, { [field]: value });
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  };
  
  if (loading) {
      return <Skeleton className="h-48 w-full" />
  }

  return (
    <ScrollArea className="w-full h-[400px] border rounded-lg">
        <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                    <TableHead className="w-[150px]">Company Name</TableHead>
                    <TableHead>HR Name</TableHead>
                    <TableHead>HR LinkedIn</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email ID</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {contacts.map(contact => (
                    <TableRow key={contact.id}>
                        <TableCell><EditableCell value={contact.companyName} onSave={(val) => handleUpdate(contact.id, 'companyName', val)} /></TableCell>
                        <TableCell><EditableCell value={contact.hrName} onSave={(val) => handleUpdate(contact.id, 'hrName', val)} /></TableCell>
                        <TableCell><EditableCell value={contact.hrLinkedIn} onSave={(val) => handleUpdate(contact.id, 'hrLinkedIn', val)} /></TableCell>
                        <TableCell><EditableCell value={contact.contact} onSave={(val) => handleUpdate(contact.id, 'contact', val)} /></TableCell>
                        <TableCell><EditableCell value={contact.emailId} onSave={(val) => handleUpdate(contact.id, 'emailId', val)} /></TableCell>
                        <TableCell><EditableCell value={contact.remarks} onSave={(val) => handleUpdate(contact.id, 'remarks', val)} /></TableCell>
                        <TableCell>
                            <Select value={contact.status} onValueChange={(val) => handleUpdate(contact.id, 'status', val)}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Pitched">Pitched</SelectItem>
                                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                                    <SelectItem value="Converted">Converted</SelectItem>
                                    <SelectItem value="Declined">Declined</SelectItem>
                                </SelectContent>
                            </Select>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </ScrollArea>
  );
}
