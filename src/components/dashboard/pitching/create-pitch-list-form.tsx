
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, PlusCircle, Trash2, Sheet } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { User, PitchList, PitchContact } from '@/lib/types';
import { createPitchListWithContacts } from '@/services/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

const pitchContactSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required.'),
  hrName: z.string().optional(),
  hrLinkedIn: z.string().optional(),
  contact: z.string().optional(),
  emailId: z.string().email('Invalid email format.').optional().or(z.literal('')),
  remarks: z.string().optional(),
});

// A less strict schema for the main form to allow submission with only company name
const pitchListSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  contacts: z.array(pitchContactSchema.partial().extend({ companyName: z.string() })),
});

type PitchListFormData = z.infer<typeof pitchListSchema>;

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

export function CreatePitchListForm({ users }: { users: User[] }) {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const { toast } = useToast();
  
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setValue, trigger } = useForm<PitchListFormData>({
    resolver: zodResolver(pitchListSchema),
    defaultValues: {
      title: '',
      contacts: [{ companyName: '', hrName: '', hrLinkedIn: '', contact: '', emailId: '', remarks: '' }],
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'contacts',
  });

  const handleBulkImport = () => {
    const rows = bulkText.trim().split('\n');
    if (rows.length === 0 || (rows.length === 1 && rows[0].trim() === '')) {
      toast({ variant: 'destructive', title: 'No data to import', description: 'Please paste some data from your spreadsheet.'});
      return;
    }

    const newContacts = rows.map(row => {
      const columns = row.split('\t'); // Tab-separated for Excel/Sheets copy-paste
      return {
        companyName: columns[0] || '',
        hrName: columns[1] || '',
        hrLinkedIn: columns[2] || '',
        contact: columns[3] || '',
        emailId: columns[4] || '',
        remarks: columns[5] || '',
      };
    }).filter(contact => contact.companyName.trim() !== ''); // Filter out empty rows

    if (newContacts.length === 0) {
      toast({ variant: 'destructive', title: 'No valid data found', description: 'Make sure at least the Company Name is filled.'});
      return;
    }

    replace(newContacts);
    toast({ title: `${newContacts.length} contacts imported successfully.` });
    setShowBulkImport(false);
    setBulkText('');
  };

  const onSubmit = async (data: PitchListFormData) => {
    if (!currentUser) return;
    
    // Filter out any rows where companyName is empty before submitting
    const validContacts = data.contacts.filter(c => c.companyName && c.companyName.trim() !== '');

    if (validContacts.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Contacts to Save',
            description: 'Please add at least one contact with a company name.',
        });
        return;
    }
    
    const contactsWithStatus = validContacts.map(c => ({...c, status: 'Pending' as const}));

    try {
      const listData: Omit<PitchList, 'id'> = {
        title: data.title,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        status: 'Open',
      };
      // Note: The service function `createPitchListWithContacts` expects the correct full type
      await createPitchListWithContacts(listData, contactsWithStatus as Omit<PitchContact, 'id'>[]);

      toast({
        title: 'Pitch List Created!',
        description: `The list "${data.title}" has been posted.`,
      });
      setOpen(false);
      reset({ title: '', contacts: [{ companyName: '', hrName: '', hrLinkedIn: '', contact: '', emailId: '', remarks: '' }] });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: "An Error Occurred", description: "Could not create the pitch list." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New Pitch List</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Create New Pitch List</DialogTitle>
          <DialogDescription>Add a title and one or more company contacts to this list.</DialogDescription>
        </DialogHeader>
        
        {showBulkImport ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                <h3 className="font-medium">Import from Spreadsheet</h3>
                <p className="text-sm text-muted-foreground">
                    Copy columns from your spreadsheet (Excel, Google Sheets) and paste them below. Ensure the columns are in this order: <br/>
                    <code className="text-xs p-1 bg-muted rounded-sm">Company Name, HR Name, HR LinkedIn, Contact, Email ID, Remarks</code>
                </p>
                <Textarea 
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste your data here..."
                    className="flex-1 font-mono text-xs"
                />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button>
                    <Button onClick={handleBulkImport}>Import Contacts</Button>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit(onSubmit)} id="pitch-list-form" className="flex-1 flex flex-col overflow-hidden">
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">List Title</Label>
                        <Input id="title" {...register('title')} />
                        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                    </div>
                </div>
                
                <Label>Company Contacts</Label>
                <div className="mt-2 border rounded-lg overflow-hidden flex-1 flex flex-col">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/50 z-10">
                                <TableRow>
                                    <TableHead className="w-[200px]">Company Name</TableHead>
                                    <TableHead>HR Name</TableHead>
                                    <TableHead>HR LinkedIn</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Email ID</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <EditableCell 
                                                value={field.companyName} 
                                                onSave={(value) => {
                                                    setValue(`contacts.${index}.companyName`, value);
                                                    trigger(`contacts.${index}.companyName`);
                                                }}
                                            />
                                            {errors.contacts?.[index]?.companyName && <p className="text-xs text-destructive mt-1">{errors.contacts?.[index]?.companyName?.message}</p>}
                                        </TableCell>
                                        <TableCell><EditableCell value={field.hrName} onSave={(val) => setValue(`contacts.${index}.hrName`, val)} /></TableCell>
                                        <TableCell><EditableCell value={field.hrLinkedIn} onSave={(val) => setValue(`contacts.${index}.hrLinkedIn`, val)} /></TableCell>
                                        <TableCell><EditableCell value={field.contact} onSave={(val) => setValue(`contacts.${index}.contact`, val)} /></TableCell>
                                        <TableCell>
                                            <EditableCell 
                                                value={field.emailId} 
                                                onSave={(value) => {
                                                    setValue(`contacts.${index}.emailId`, value);
                                                    trigger(`contacts.${index}.emailId`);
                                                }} 
                                            />
                                            {errors.contacts?.[index]?.emailId && <p className="text-xs text-destructive mt-1">{errors.contacts?.[index]?.emailId?.message}</p>}
                                        </TableCell>
                                        <TableCell><EditableCell value={field.remarks} onSave={(val) => setValue(`contacts.${index}.remarks`, val)} /></TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    {errors.contacts?.root && <p className="p-4 text-sm text-destructive">{errors.contacts.root.message}</p>}
                </div>
                <div className="flex justify-start gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => append({ companyName: '', hrName: '', hrLinkedIn: '', contact: '', emailId: '', remarks: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowBulkImport(true)}>
                        <Sheet className="mr-2 h-4 w-4" /> Import from Sheet
                    </Button>
                </div>
                 <DialogFooter className="pt-4">
                    <Button type="submit" form="pitch-list-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create List
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
