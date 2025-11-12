

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User, Announcement, Document, AnnouncementAudience } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Loader2, MoreVertical, Edit, Trash2, FileText, Download, Upload, Users, UserCheck, ChevronDown, Mic, Square, Pause, Pin, PinOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { createAnnouncement, getAnnouncements, getUsers, updateAnnouncement, deleteAnnouncement } from '@/services/firestore';
import { uploadFile } from '@/services/storage';
import { Skeleton } from '../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';
import { FileUploader } from '../ui/file-uploader';


const INITIAL_ANNOUNCEMENTS_COUNT = 3;

export function Announcements() {
    const { user: currentUser } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(INITIAL_ANNOUNCEMENTS_COUNT);

    useEffect(() => {
        setLoading(true);
        if (!currentUser) return;
        
        const unsubscribe = getAnnouncements(currentUser, (data) => {
            // Sort to show pinned first, then by date
            const sortedData = data.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setAnnouncements(sortedData);
            setLoading(false);
        });
        
        getUsers().then(setUsers);

        return () => unsubscribe();
    }, [currentUser]);
    
    if (!currentUser) return null;

    const canManage = currentUser.role === 'SPT' || currentUser.role === 'JPT';
    
    const { pinned, unpinned } = useMemo(() => {
        const pinned = announcements.filter(a => a.isPinned);
        const unpinned = announcements.filter(a => !a.isPinned);
        return { pinned, unpinned };
    }, [announcements]);

    const visibleUnpinned = unpinned.slice(0, visibleCount);
    
    if (loading) {
        return (
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-8 w-64" />
                    {canManage && <Skeleton className="h-10 w-44" />}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between border-b border-t py-4">
                <div>
                    <h2 className="text-2xl font-bold font-headline tracking-tight">Announcements</h2>
                    <p className="text-muted-foreground">Catch up on the latest updates and news.</p>
                </div>
                {canManage && <CreateAnnouncementForm />}
            </div>

            <div className='space-y-4 mt-6'>
                <div className="space-y-6">
                    {[...pinned, ...visibleUnpinned].map(announcement => (
                        <AnnouncementCard key={announcement.id} announcement={announcement} users={users} canManage={canManage} />
                    ))}
                    
                    {announcements.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-40 bg-card">
                            <Megaphone className="w-10 h-10 text-muted-foreground" />
                            <h3 className="text-xl font-bold tracking-tight font-headline mt-4">No Announcements Yet</h3>
                            <p className="text-sm text-muted-foreground">JPTs and SPTs can post announcements here.</p>
                        </div>
                    )}
                </div>

                {unpinned.length > visibleCount && (
                    <div className="text-center mt-6">
                        <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 5)}>
                            View Older Announcements
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function AnnouncementCard({ announcement, users, canManage }: { announcement: Announcement, users: User[], canManage: boolean}) {
    const author = users.find(u => u.id === announcement.authorId);
    return (
        <Collapsible key={announcement.id} asChild>
            <Card className={cn("transition-all hover:shadow-md", announcement.isPinned && "border-primary/50 shadow-lg")}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={author?.avatar} alt={author?.name} />
                                <AvatarFallback>{author?.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="font-headline text-xl flex items-center gap-2">
                                     {announcement.isPinned && <Pin className="h-5 w-5 text-primary" />}
                                    {announcement.title}
                                    {announcement.audience === 'jpt-only' && (
                                        <Badge variant="secondary" className='flex items-center gap-1'>
                                            <UserCheck className='w-3 h-3'/> JPTs Only
                                        </Badge>
                                    )}
                                </CardTitle>
                                {author && <p className="text-sm text-muted-foreground">
                                    Posted by {author?.name} ({author?.role}) - {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                                </p>}
                            </div>
                        </div>
                        <div className='flex items-center'>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0 data-[state=open]:rotate-180 transition-transform">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                            {canManage && <AnnouncementActions announcement={announcement} />}
                        </div>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{announcement.content}</p>
                         {announcement.voiceNoteUrl && (
                            <div className="mt-4 space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Content Voice Note</p>
                                <audio src={announcement.voiceNoteUrl} controls className="w-full h-10" />
                            </div>
                        )}
                    </CardContent>
                    {(announcement.documents && announcement.documents.length > 0) && (
                        <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                            <h4 className="font-semibold text-sm">Attached Documents:</h4>
                            <ul className="space-y-2 w-full">
                                {announcement.documents.map(doc => {
                                const uploader = users.find(u => u.id === doc.uploadedBy);
                                return (
                                    <li key={doc.id} className="flex items-center justify-between text-sm hover:bg-muted/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <div className='flex flex-col'>
                                            <span className="font-medium">{doc.name}</span>
                                            {uploader && <span className='text-xs text-muted-foreground'>
                                                by {uploader.name} - {formatDistanceToNow(new Date(doc.createdAt), {addSuffix: true})}
                                            </span>}
                                        </div>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4"/></a>
                                        </Button>
                                    </li>
                                )
                                })}
                            </ul>
                        </CardFooter>
                    )}
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  content: z.string().optional(),
  files: z.array(z.instanceof(File)).optional(),
  documents: z.array(z.custom<Document>()).optional(),
  audience: z.string().optional(),
  voiceNoteUrl: z.string().optional(),
  isPinned: z.boolean().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

type RecordingStatus = 'idle' | 'recording' | 'paused';


function CreateAnnouncementForm({ isEdit = false, announcement, onFormOpenChange }: { isEdit?: boolean; announcement?: Announcement, onFormOpenChange?: (open: boolean) => void }) {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const handleOpenChange = (open: boolean) => {
    if (onFormOpenChange) {
      onFormOpenChange(open);
    } else {
      setDialogOpen(open);
    }
  };

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting }, reset } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined, isPinned: false },
  });

  useEffect(() => {
    if (isEdit && announcement) {
      reset({ title: announcement.title, content: announcement.content, documents: announcement.documents || [], audience: announcement.audience || 'all', files: [], voiceNoteUrl: announcement.voiceNoteUrl, isPinned: announcement.isPinned });
    } else {
      reset({ title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined, isPinned: false });
    }
  }, [isEdit, announcement, reset]);

  const files = watch('files') || [];
  const voiceNoteUrl = watch('voiceNoteUrl');

  const startRecording = async () => {
    if (recordingStatus === 'paused') {
        mediaRecorderRef.current?.resume();
        setRecordingStatus('recording');
        toast({ title: "Recording resumed." });
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            try {
                const tempId = announcement?.id || `temp_${Date.now()}`;
                const downloadURL = await uploadFile(new File([audioBlob], "announcement-content.webm"), `announcements/${tempId}/voice-notes`);
                setValue('voiceNoteUrl', downloadURL);
                toast({ title: "Voice note added!" });
            } catch (error) {
                console.error("Failed to upload voice note:", error);
                toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload voice note." });
            } finally {
                audioChunksRef.current = [];
                setRecordingStatus('idle');
                stream.getTracks().forEach(track => track.stop());
            }
        };
        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setRecordingStatus('recording');
        toast({ title: "Recording started..." });
    } catch (err) {
        console.error("Error accessing microphone:", err);
        toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser." });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingStatus('paused');
      toast({ title: "Recording paused." });
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
          mediaRecorderRef.current?.stop();
      }
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    if (!currentUser) return;
    setUploading(true);

    try {
        let uploadedDocuments: Document[] = data.documents || [];

        if (data.files && data.files.length > 0) {
            const tempId = announcement?.id || `temp_${Date.now()}`;
            const uploadPromises = data.files.map(file => uploadFile(file, `announcements/${tempId}/documents`));
            const downloadURLs = await Promise.all(uploadPromises);
            
            const newDocuments: Document[] = data.files.map((file, index) => ({
                id: `doc_${Date.now()}_${index}`,
                name: file.name,
                url: downloadURLs[index],
                uploadedBy: currentUser.id,
                createdAt: new Date().toISOString(),
            }));
            uploadedDocuments = [...uploadedDocuments, ...newDocuments];
        }

        const finalData = { ...data, documents: uploadedDocuments };
        delete (finalData as any).files;

        if(isEdit && announcement) {
            const updateData: Partial<Announcement> = { ...finalData };
            if(currentUser.role === 'SPT') {
                updateData.audience = data.audience as AnnouncementAudience;
            }
            await updateAnnouncement(announcement.id, updateData);
            toast({ title: 'Announcement Updated!' });
        } else {
            const newAnnouncementData: Omit<Announcement, 'id'> = {
                title: finalData.title,
                authorId: currentUser.id,
                createdAt: new Date().toISOString(),
                audience: 'all',
                documents: finalData.documents,
                isPinned: finalData.isPinned || false,
            };

            if (finalData.content) {
                newAnnouncementData.content = finalData.content;
            } else {
                 newAnnouncementData.content = ''; // Ensure content is not undefined
            }

            if (finalData.voiceNoteUrl) {
                newAnnouncementData.voiceNoteUrl = finalData.voiceNoteUrl;
            }
            
            if(currentUser.role === 'SPT') {
                newAnnouncementData.audience = data.audience as AnnouncementAudience;
            }
            
            await createAnnouncement(newAnnouncementData);
            toast({
                title: 'Announcement Posted!',
                description: `Your announcement "${data.title}" is now live.`,
            });
        }
        handleOpenChange(false);
        reset({ title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined, isPinned: false });

    } catch (err) {
         toast({variant: 'destructive', title: "An Error Occurred", description: "Could not save the announcement."});
    } finally {
        setUploading(false);
    }
  };
  
  return (
    <Dialog open={onFormOpenChange ? undefined : dialogOpen} onOpenChange={handleOpenChange}>
      {!isEdit && (
         <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
        </DialogTrigger>
      )}
     <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEdit ? 'Edit Announcement' : 'Post a New Announcement'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modify the details below.' : 'This announcement will be visible to all team members.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="announcement-form" className='flex flex-col flex-1 overflow-hidden'>
          <div className="flex-1 overflow-y-auto -mr-6 pr-6 py-4 grid gap-4">
             {currentUser?.role === 'SPT' && (
                <div className="space-y-2">
                    <Label htmlFor="audience">Audience</Label>
                    <Controller
                        name="audience"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select audience..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className='flex items-center gap-2'>
                                            <Users className='w-4 h-4' /> All Members
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="jpt-only">
                                         <div className='flex items-center gap-2'>
                                            <UserCheck className='w-4 h-4' /> JPTs Only
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content (Optional)</Label>
              <div className="flex items-start gap-2">
                  <Textarea id="content" {...register('content')} className="min-h-[150px] flex-1" />
                  <div className='flex flex-col gap-2'>
                      {recordingStatus === 'idle' && (
                          <Button type="button" variant="outline" size="icon" onClick={startRecording} disabled={isSubmitting || uploading}>
                              <Mic className="h-4 w-4" />
                          </Button>
                      )}
                      {recordingStatus === 'recording' && (
                          <>
                              <Button type="button" variant="secondary" size="icon" onClick={pauseRecording}>
                                  <Pause className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="destructive" size="icon" onClick={stopRecording}>
                                  <Square className="h-4 w-4" />
                              </Button>
                          </>
                      )}
                      {recordingStatus === 'paused' && (
                          <>
                              <Button type="button" variant="secondary" size="icon" onClick={startRecording}>
                                  <Mic className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="destructive" size="icon" onClick={stopRecording}>
                                  <Square className="h-4 w-4" />
                              </Button>
                          </>
                      )}
                  </div>
              </div>
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
              {voiceNoteUrl && (
                 <div className="mt-2 space-y-1 bg-muted/50 p-3 rounded-lg">
                    <div className='flex justify-between items-center'>
                      <Label className='text-xs'>Content Voice Note</Label>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setValue('voiceNoteUrl', undefined)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <audio src={voiceNoteUrl} controls className='w-full h-10' />
                </div>
              )}
            </div>
            
            <Separator />

            <div className="space-y-2">
                <Label>Documents (Optional)</Label>
                <Controller
                    control={control}
                    name="files"
                    render={({ field }) => (
                        <FileUploader
                            value={field.value ?? []}
                            onValueChange={field.onChange}
                            dropzoneOptions={{
                                accept: {
                                    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                                    'application/pdf': ['.pdf'],
                                    'application/msword': ['.doc'],
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                                },
                                maxSize: 10 * 1024 * 1024, // 10MB
                            }}
                        />
                    )}
                />

                 {isEdit && (announcement?.documents || []).length > 0 && (
                    <div className="space-y-2 rounded-md border p-2">
                         <h4 className="font-medium text-sm text-muted-foreground">Previously Uploaded:</h4>
                         <ul className="space-y-2">
                            {(announcement?.documents || []).map(doc => (
                                <li key={doc.id} className="flex items-center justify-between text-sm p-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{doc.name}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                                        const currentDocs = watch('documents') || [];
                                        setValue('documents', currentDocs.filter(d => d.id !== doc.id));
                                    }}>
                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" form="announcement-form" disabled={isSubmitting || uploading || recordingStatus !== 'idle'}>
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Post Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function AnnouncementActions({ announcement }: { announcement: Announcement }) {
    const [editOpen, setEditOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteAnnouncement(announcement.id);
            toast({ title: "Announcement Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the announcement." });
        }
    }

    const handlePinToggle = async () => {
        try {
            await updateAnnouncement(announcement.id, { isPinned: !announcement.isPinned });
            toast({ title: announcement.isPinned ? "Announcement Unpinned" : "Announcement Pinned" });
        } catch (err) {
             toast({ variant: 'destructive', title: "Error", description: "Could not update the announcement." });
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
                        <DropdownMenuItem onSelect={handlePinToggle}>
                            {announcement.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                            <span>{announcement.isPinned ? "Unpin" : "Pin"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
                            This action cannot be undone. This will permanently delete the announcement titled "{announcement.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* This Dialog wrapper is essential for the edit functionality to be self-contained */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
               {editOpen && <CreateAnnouncementForm isEdit announcement={announcement} onFormOpenChange={setEditOpen} />}
            </Dialog>
        </>
    )
}
