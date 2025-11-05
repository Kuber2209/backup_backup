
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import type { Pitch } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { createPitch, updatePitch } from '@/services/firestore';

const pitchSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters long.'),
  contactDetails: z.string().optional(),
  otherDetails: z.string().optional(),
});

type PitchFormData = z.infer<typeof pitchSchema>;

interface CreatePitchFormProps {
  isEdit?: boolean;
  pitch?: Pitch;
  onOpenChange?: (open: boolean) => void;
}

export function CreatePitchForm({ isEdit = false, pitch, onOpenChange }: CreatePitchFormProps) {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<PitchFormData>({
    resolver: zodResolver(pitchSchema),
    defaultValues: isEdit && pitch ? {
        companyName: pitch.companyName,
        contactDetails: pitch.contactDetails,
        otherDetails: pitch.otherDetails,
    } : {
      companyName: '',
      contactDetails: '',
      otherDetails: '',
    },
  });

  const handleOpenChange = (o: boolean) => {
    if (onOpenChange) {
        onOpenChange(o);
    } else {
        setOpen(o);
    }
    if (!o) {
        reset();
    }
  }

  const onSubmit = async (data: PitchFormData) => {
    if (!currentUser) return;
    
    try {
        if (isEdit && pitch) {
            await updatePitch(pitch.id, data);
            toast({ title: 'Pitch Updated!' });
        } else {
            const newPitch: Omit<Pitch, 'id'> = {
                ...data,
                status: 'Open',
                createdBy: currentUser.id,
                createdAt: new Date().toISOString(),
            };
            await createPitch(newPitch);
            toast({ title: 'Pitch Added!', description: `${data.companyName} has been added to the list.` });
        }
        handleOpenChange(false);
    } catch (err) {
        console.error("Failed to save pitch:", err);
        toast({ variant: 'destructive', title: "Error", description: "Could not save the pitch." });
    }
  };

  const dialogContent = (
     <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{isEdit ? 'Edit Pitch' : 'Add a New Pitch'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the company details below.' : 'Add a company for associates to pitch to.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="pitch-form" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register('companyName')} />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactDetails">Contact Details (Optional)</Label>
              <Textarea id="contactDetails" {...register('contactDetails')} placeholder="e.g., John Doe - HR, john.doe@example.com"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherDetails">Other Details (Optional)</Label>
              <Textarea id="otherDetails" {...register('otherDetails')} placeholder="e.g., Mention our new AI curriculum."/>
            </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="pitch-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Pitch'}
          </Button>
        </DialogFooter>
      </DialogContent>
  );

  if (isEdit) {
      return dialogContent;
  }
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Pitch
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
