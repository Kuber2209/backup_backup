

'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Wand2, Minus, Calendar as CalendarIcon, User, X, Mic, Square, Pause, Trash2 } from 'lucide-react';
import type { Task, AssignableRole, User as UserType, Document } from '@/lib/types';
import { suggestTaskTags } from '@/ai/flows/suggest-task-tags';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { createTask, updateTask, getUsers } from '@/services/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FileUploader } from '../ui/file-uploader';
import { uploadFile } from '@/services/storage';


const taskSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  deadline: z.date().optional(),
  deadlineTime: z.string().optional(),
  assignableTo: z.array(z.string()).min(1, 'You must select at least one role to assign the task to.'),
  requiredJpts: z.number().min(0).optional(),
  requiredAssociates: z.number().min(0).optional(),
  assignedTo: z.array(z.string()).optional(), // For direct assignment
  isAnonymous: z.boolean().optional(),
  files: z.array(z.instanceof(File)).optional(),
  documents: z.array(z.custom<Document>()).optional(),
  voiceNoteUrl: z.string().optional(),
}).refine(data => {
    if (data.assignableTo.includes('JPT') && (data.requiredJpts === undefined || data.requiredJpts < 1)) {
        return false;
    }
    return true;
}, {
    message: "Number of JPTs must be at least 1.",
    path: ["requiredJpts"],
}).refine(data => {
    if (data.assignableTo.includes('Associate') && (data.requiredAssociates === undefined || data.requiredAssociates < 1)) {
        return false;
    }
    return true;
}, {
    message: "Number of Associates must be at least 1.",
    path: ["requiredAssociates"],
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskFormProps {
  isEdit?: boolean;
  task?: Task;
  onOpenChange?: (open: boolean) => void;
}

type RecordingStatus = 'idle' | 'recording' | 'paused';


export function CreateTaskForm({ isEdit = false, task, onOpenChange }: CreateTaskFormProps) {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const { toast } = useToast();

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    getUsers().then(setAllUsers);
  }, [])

  const getInitialValues = () => {
    if (isEdit && task) {
        let deadlineDate;
        let deadlineTimeValue;
        if (task.deadline) {
            const d = new Date(task.deadline);
            deadlineDate = d;
            deadlineTimeValue = format(d, 'HH:mm');
        }

        return {
            title: task.title,
            description: task.description,
            tags: task.tags || [],
            assignableTo: task.assignableTo,
            requiredJpts: task.requiredJpts || 1,
            requiredAssociates: task.requiredAssociates || 1,
            deadline: deadlineDate,
            deadlineTime: deadlineTimeValue,
            assignedTo: task.assignedTo || [],
            isAnonymous: task.isAnonymous || false,
            documents: task.documents || [],
            files: [],
            voiceNoteUrl: task.voiceNoteUrl,
        };
    }
    return {
      title: '',
      description: '',
      tags: [],
      assignableTo: currentUser?.role === 'JPT' ? ['Associate'] : [],
      requiredJpts: 1,
      requiredAssociates: 1,
      deadline: undefined,
      deadlineTime: undefined,
      assignedTo: [],
      isAnonymous: false,
      documents: [],
      files: [],
      voiceNoteUrl: undefined,
    };
  };

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting }, reset } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getInitialValues(),
  });

  useEffect(() => {
      reset(getInitialValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, task, reset]);

  const tags = watch('tags') || [];
  const description = watch('description');
  const assignableTo = watch('assignableTo');
  const requiredJpts = watch('requiredJpts');
  const requiredAssociates = watch('requiredAssociates');
  const deadline = watch('deadline');
  const assignedTo = watch('assignedTo') || [];
  const voiceNoteUrl = watch('voiceNoteUrl');


  useEffect(() => {
    if (!assignableTo.includes('JPT')) setValue('requiredJpts', 0);
    if (!assignableTo.includes('Associate')) setValue('requiredAssociates', 0);
  }, [assignableTo, setValue]);

  const handleSuggestTags = async () => {
    if (!description || description.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Description too short',
        description: 'Please provide a longer description to suggest tags.',
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestTaskTags({ taskDescription: description });
      const newTags = [...new Set([...tags, ...result.tags])];
      setValue('tags', newTags.slice(0, 5)); // Limit to 5 tags
    } catch (error) {
      console.error('Error suggesting tags:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not suggest tags at this time.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setValue('tags', [...tags, trimmedTag]);
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

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
                    const tempId = task?.id || `temp_${Date.now()}`;
                    const downloadURL = await uploadFile(new File([audioBlob], "task-description.webm"), `tasks/${tempId}/voice-notes`);
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
  
  const onSubmit = async (data: TaskFormData) => {
    if (!currentUser) return;

    setIsUploading(true);

    try {
        let uploadedDocuments: Document[] = data.documents || [];

        if (data.files && data.files.length > 0) {
            const tempId = task?.id || `temp_${Date.now()}`;
            const uploadPromises = data.files.map(file => uploadFile(file, `tasks/${tempId}/documents`));
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

        let deadlineISO: string | undefined = undefined;
        if (data.deadline) {
            const date = new Date(data.deadline);
            if (data.deadlineTime) { // Check if time is set
                const [hours, minutes] = data.deadlineTime.split(':');
                date.setHours(parseInt(hours, 10));
                date.setMinutes(parseInt(minutes, 10));
            } else {
                // If no time is set, default to the end of the day
                date.setHours(23, 59, 59, 999);
            }
            deadlineISO = date.toISOString();
        }

        const finalData: Partial<Task> = {
            ...data,
            deadline: deadlineISO,
            documents: uploadedDocuments,
            assignableTo: data.assignableTo as AssignableRole[],
        };

        delete (finalData as any).files;
        delete (finalData as any).deadlineTime;

        if (!finalData.voiceNoteUrl) delete finalData.voiceNoteUrl;
        if (!finalData.description) delete finalData.description;

        if (!finalData.assignableTo.includes('JPT')) {
            delete finalData.requiredJpts;
        }
        if (!finalData.assignableTo.includes('Associate')) {
            delete finalData.requiredAssociates;
        }

        if (isEdit && task) {
            await updateTask(task.id, finalData);
            toast({ title: 'Task Updated!' });
        } else {
            const newTaskData: Omit<Task, 'id'> = {
                title: data.title,
                description: data.description || '',
                tags: data.tags || [],
                status: 'Open',
                createdBy: currentUser.id,
                assignedTo: data.assignedTo || [],
                assignableTo: data.assignableTo as AssignableRole[],
                createdAt: new Date().toISOString(),
                messages: [],
                documents: uploadedDocuments,
                deadline: deadlineISO,
                isAnonymous: data.isAnonymous || false,
            };

            if (data.assignableTo.includes('JPT')) {
                newTaskData.requiredJpts = data.requiredJpts;
            }
            if (data.assignableTo.includes('Associate')) {
                newTaskData.requiredAssociates = data.requiredAssociates;
            }
            if (data.voiceNoteUrl) {
                newTaskData.voiceNoteUrl = data.voiceNoteUrl;
            }

            await createTask(newTaskData);

            toast({
                title: 'Task Created!',
                description: `The task "${data.title}" has been posted.`,
            });
        }
    } catch (err) {
        console.error("Failed to save task:", err);
        toast({ variant: 'destructive', title: "An Error Occurred", description: "Could not save the task." });
    } finally {
        setIsUploading(false);
        const currentSetOpen = onOpenChange || setOpen;
        currentSetOpen(false);
        reset(getInitialValues());
    }
  };
  
  if (!currentUser) return null;

  const canCreateFor = {
      JPT: currentUser.role === 'SPT',
      Associate: currentUser.role === 'SPT' || currentUser.role === 'JPT',
  }

  const availableUsersForAssignment = allUsers.filter(u => assignableTo.includes(u.role as AssignableRole) && !assignedTo.includes(u.id) && !u.isOnHoliday);
  const selectedUsers = allUsers.filter(u => assignedTo.includes(u.id));

  const dialogContent = (
       <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEdit ? 'Edit Task' : 'Create a New Task'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modify the details of this task.' : 'Fill in the details below to post a new task.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
          <ScrollArea className="h-full">
            <form onSubmit={handleSubmit(onSubmit)} id="create-task-form" className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Assign Task To Roles</Label>
                    <div className="flex gap-4 items-center">
                        {canCreateFor.JPT && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="assign-jpt" checked={assignableTo.includes('JPT')} onCheckedChange={(checked) => {
                                    const newAssignable = checked ? [...assignableTo, 'JPT'] : assignableTo.filter(r => r !== 'JPT');
                                    setValue('assignableTo', newAssignable);
                                }} />
                                <Label htmlFor="assign-jpt">JPTs</Label>
                            </div>
                        )}
                        {canCreateFor.Associate && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="assign-associate" checked={assignableTo.includes('Associate')} onCheckedChange={(checked) => {
                                    const newAssignable = checked ? [...assignableTo, 'Associate'] : assignableTo.filter(r => r !== 'Associate');
                                    setValue('assignableTo', newAssignable);
                                }}/>
                                <Label htmlFor="assign-associate">Associates</Label>
                            </div>
                        )}
                    </div>
                    {errors.assignableTo && <p className="text-sm text-destructive">{errors.assignableTo.message}</p>}
                </div>

                {assignableTo.includes('JPT') && canCreateFor.JPT && (
                    <div className="space-y-2">
                      <Label htmlFor="requiredJpts">Number of Required JPTs</Label>
                      <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => setValue('requiredJpts', Math.max(1, (requiredJpts || 1) - 1))}>
                              <Minus className="h-4 w-4" />
                          </Button>
                          <Input id="requiredJpts" type="number" className="w-16 text-center" {...register('requiredJpts', { valueAsNumber: true, min: 1 })} />
                          <Button type="button" variant="outline" size="icon" onClick={() => setValue('requiredJpts', ((requiredJpts || 0) + 1))}>
                              <Plus className="h-4 w-4" />
                          </Button>
                      </div>
                      {errors.requiredJpts && <p className="text-sm text-destructive">{errors.requiredJpts.message}</p>}
                    </div>
                )}
                
                {assignableTo.includes('Associate') && canCreateFor.Associate && (
                    <div className="space-y-2">
                      <Label htmlFor="requiredAssociates">Number of Required Associates</Label>
                      <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => setValue('requiredAssociates', Math.max(1, (requiredAssociates || 1) - 1))}>
                              <Minus className="h-4 w-4" />
                          </Button>
                          <Input id="requiredAssociates" type="number" className="w-16 text-center" {...register('requiredAssociates', { valueAsNumber: true, min: 1 })} />
                          <Button type="button" variant="outline" size="icon" onClick={() => setValue('requiredAssociates', ((requiredAssociates || 0) + 1))}>
                              <Plus className="h-4 w-4" />
                          </Button>
                      </div>
                      {errors.requiredAssociates && <p className="text-sm text-destructive">{errors.requiredAssociates.message}</p>}
                    </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register('title')} />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <div className="flex items-start gap-2">
                        <Textarea id="description" {...register('description')} className="min-h-[120px] flex-1" />
                        <div className='flex flex-col gap-2'>
                            {recordingStatus === 'idle' && (
                                <Button type="button" variant="outline" size="icon" onClick={startRecording} disabled={isSubmitting || isUploading}>
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
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                    {voiceNoteUrl && (
                        <div className="mt-2 space-y-1 bg-muted/50 p-3 rounded-lg">
                          <div className='flex justify-between items-center'>
                            <Label className='text-xs'>Description Voice Note</Label>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setValue('voiceNoteUrl', undefined)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <audio src={voiceNoteUrl} controls className='w-full h-10' />
                        </div>
                    )}
                </div>

                 <div className="space-y-2">
                    <Label>Directly Assign (Optional)</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className='w-full justify-start font-normal'>
                                <User className="mr-2 h-4 w-4" /> Select users...
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search users..." />
                                <CommandList>
                                    <CommandEmpty>No users found for selected roles.</CommandEmpty>
                                    <CommandGroup>
                                        {availableUsersForAssignment.map(user => (
                                            <CommandItem key={user.id} onSelect={() => setValue('assignedTo', [...assignedTo, user.id])}>
                                                <Avatar className="mr-2 h-6 w-6">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                {user.name} ({user.role})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedUsers.map(user => (
                                <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.name.slice(0,1)}</AvatarFallback>
                                    </Avatar>
                                    {user.name}
                                    <button type="button" onClick={() => setValue('assignedTo', assignedTo.filter(id => id !== user.id))}>
                                        <X className='h-3 w-3 ml-1'/>
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                 </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                    <div className="flex gap-2">
                        <Controller
                            control={control}
                            name="deadline"
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                         <Controller
                            control={control}
                            name="deadlineTime"
                            render={({ field }) => (
                               <Input 
                                 type="time" 
                                 className="w-[120px]" 
                                 value={field.value ?? ''}
                                 onChange={field.onChange}
                                 disabled={!deadline}
                               />
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Attach Documents (Optional)</Label>
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
                </div>

                <div className="space-y-2">
                    <Label>Tags (Optional)</Label>
                    <div className="flex gap-2">
                        <Input 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                            placeholder="Add a tag and press Enter"
                        />
                        <Button type="button" variant="outline" onClick={handleAddTag}>Add</Button>
                        <Button type="button" variant="ghost" size="icon" onClick={handleSuggestTags} disabled={isSuggesting} aria-label="Suggest Tags">
                            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                    </div>
                    {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="group relative pr-5 cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                                {tag}
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100">&times;</span>
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <Checkbox
                        id="isAnonymous"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="isAnonymous">Post Anonymously</Label>
                </div>
            </form>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button type="submit" form="create-task-form" disabled={isSubmitting || isUploading || recordingStatus !== 'idle'}>
            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Uploading...' : isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
  );

  // If this is an edit form, we don't wrap it in a Dialog Trigger
  if (isEdit) {
    return dialogContent;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) reset(getInitialValues());
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Task
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
