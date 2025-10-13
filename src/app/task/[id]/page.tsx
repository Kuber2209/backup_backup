

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Calendar, Tag, Users, Check, Send, Clock, Upload, Download, Replace, FileText, Globe, MessageSquareQuote, X, Mic, Square, Pause, Undo2 } from 'lucide-react';
import type { Task, User, Message, Document } from '@/lib/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/dashboard/header';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { getTask, getTaskUsers, updateTask, getUsers } from '@/services/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { uploadFile } from '@/services/storage';
import { FileUploader } from '@/components/ui/file-uploader';
import { Loader2 } from 'lucide-react';


const statusStyles: { [key: string]: string } = {
  'Open': 'bg-primary/10 text-primary border-primary/20',
  'In Progress': 'bg-accent/10 text-accent border-accent/20',
  'Completed': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const taskId = params.id as string;
  const { user: currentUser, loading: authLoading } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [taskUsers, setTaskUsers] = useState<User[]>([]); // All users related to the task
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const fetchTaskAndUsers = useCallback(async (id: string) => {
    setLoading(true);
    const unsubscribe = getTask(id, async (taskData) => {
      if (taskData) {
        setTask(taskData);
        // Fetch users immediately after task data is received.
        const users = await getTaskUsers(taskData);
        setTaskUsers(users);
        setLoading(false);
      } else {
        toast({variant: 'destructive', title: 'Task not found'});
        setLoading(false);
        router.push('/dashboard');
      }
    });
    return unsubscribe;
  }, [router, toast]);


  useEffect(() => {
    if (taskId) {
        const unsubscribePromise = fetchTaskAndUsers(taskId);
        return () => {
            unsubscribePromise.then(unsub => unsub());
        };
    }
  }, [taskId, fetchTaskAndUsers]);

  const onTaskUpdate = async (updatedTask: Partial<Task>) => {
    if (!task) return;
    await updateTask(task.id, updatedTask);
  }

  const createdBy = useMemo(() => taskUsers.find(u => u.id === task?.createdBy), [taskUsers, task?.createdBy]);
  const assignedUsers = useMemo(() => taskUsers.filter(u => task?.assignedTo.includes(u.id)), [taskUsers, task?.assignedTo]);
  
  const canChat = useMemo(() => {
       if (!currentUser || !task) return false;
       if (task.status === 'Completed') return false;
       // Creator, assigned users, SPTs, and JPTs can chat
       return task.createdBy === currentUser.id || 
              task.assignedTo.includes(currentUser.id) ||
              currentUser.role === 'SPT' ||
              currentUser.role === 'JPT';
  }, [currentUser, task]);


  if (authLoading || loading || !task || !currentUser) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Skeleton className="h-9 w-32 mb-4" />
                <Skeleton className="h-[250px] w-full" />
                <Separator className="my-8" />
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                     <div className="space-y-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        </main>
      </div>
    );
  }

  const isDeadlinePast = task.deadline ? isPast(new Date(task.deadline)) : false;

  const handleSendMessage = async (voiceNoteUrl?: string) => {
    if ((!newMessage || newMessage.trim() === '') && !voiceNoteUrl) return;
    if (!task || !currentUser) return;
    
    const sender = taskUsers.find(u => u.id === currentUser.id);
    if (!sender) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      userId: currentUser.id,
      text: newMessage,
      createdAt: new Date().toISOString(),
    };
    
    if (voiceNoteUrl) {
      message.voiceNote = {
        id: `vn_${Date.now()}`,
        url: voiceNoteUrl,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      }
    }

    if (replyTo) {
      const replyToUser = taskUsers.find(u => u.id === replyTo.userId);
      message.replyTo = {
        messageId: replyTo.id,
        text: replyTo.text,
        userName: replyToUser?.name || 'Unknown User'
      }
    }

    const updatedMessages = [...(task.messages || []), message];
    await onTaskUpdate({ messages: updatedMessages });

    setNewMessage('');
    setReplyTo(null);
    toast({ title: 'Message sent!' });
  };

  const handleCompleteTask = async () => {
    await onTaskUpdate({ status: 'Completed', completedAt: new Date().toISOString() });
    toast({ title: 'Task Marked as Complete!', description: 'Great job!'});
  };

  const handleUnmarkComplete = async () => {
    const updateData: Partial<Task> = { status: 'In Progress' };
    
    // Create a temporary object and delete the property.
    // Sending `undefined` to Firestore causes an error.
    const taskWithCompletion = { ...task, ...updateData };
    delete (taskWithCompletion as Partial<Task>).completedAt;

    // The updateTask function expects the field to be absent, not undefined.
    const finalUpdate: Partial<Task> = { status: 'In Progress' };
    if (task.completedAt) {
      // This is a bit of a trick. We need a way to signal deletion.
      // Firestore's `deleteField()` is the "right" way, but would require service changes.
      // The easiest fix here is to ensure the update object doesn't contain the undefined field.
      const updateObj: any = { status: 'In Progress', completedAt: undefined };
      delete updateObj.completedAt;
      await onTaskUpdate(updateObj);
    } else {
      await onTaskUpdate(finalUpdate);
    }

    toast({ title: 'Task Re-opened!', description: 'The task has been moved back to "In Progress".'});
  }
  
  const isUserAssigned = task.assignedTo.includes(currentUser.id);
  const canComplete = (task.status === 'In Progress' || task.status === 'Open') && isUserAssigned;
  const canUnmarkComplete = task.status === 'Completed' && (currentUser.role === 'SPT' || currentUser.role === 'JPT');
  const canTransfer = currentUser.role === 'Associate' && task.status === 'In Progress' && isUserAssigned;

  const assignedJptsCount = assignedUsers.filter(a => a.role === 'JPT').length;
  const assignedAssociatesCount = assignedUsers.filter(a => a.role === 'Associate').length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <Header />
       <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="font-headline text-2xl mb-2">{task.title}</CardTitle>
                <Badge variant="outline" className={`whitespace-nowrap ${statusStyles[task.status]}`}>{task.status}</Badge>
              </div>
              <CardDescription className="text-base whitespace-pre-wrap">{task.description}</CardDescription>
               {task.voiceNoteUrl && (
                <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Description Voice Note</p>
                    <audio src={task.voiceNoteUrl} controls className="w-full h-10" />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </div>
                {task.deadline && (
                    <div className={cn(
                        "flex items-center text-sm",
                        isDeadlinePast && task.status !== 'Completed' ? "text-destructive" : "text-muted-foreground"
                        )}>
                        <Clock className="w-4 h-4 mr-2" />
                        Deadline: {format(new Date(task.deadline), 'PPP p')}
                        {isDeadlinePast && task.status !== 'Completed' && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                    </div>
                )}
                <div className="flex items-center text-muted-foreground">
                  <Tag className="w-4 h-4 mr-2" />
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
                  </div>
                </div>
                {createdBy && (
                  <div className="flex items-center text-muted-foreground">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Posted by {task.isAnonymous ? `a ${createdBy.role}` : createdBy.name}
                  </div>
                )}
                 <div className="flex items-center text-muted-foreground col-span-2">
                    <Users className="w-4 h-4 mr-2" />
                    Requirements: 
                    {task.requiredJpts ? <span className='ml-1'>{assignedJptsCount}/{task.requiredJpts} JPTs</span> : ''}
                    {task.requiredJpts && task.requiredAssociates ? <span className='mx-1'>&</span> : ''}
                    {task.requiredAssociates ? <span>{assignedAssociatesCount}/{task.requiredAssociates} Associates</span> : ''}
                </div>
              </div>
              {task.completedAt && (
                <div className="flex items-center text-sm text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    Completed on {format(new Date(task.completedAt), 'PPP')}
                </div>
              )}
            </CardContent>
            <CardFooter>
                {assignedUsers.length > 0 && (
                    <div className="w-full">
                        <p className="text-sm font-medium mb-2">Assigned Team:</p>
                        <div className="flex flex-wrap gap-2">
                            {assignedUsers.map(associate => (
                                <TooltipProvider key={associate.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                           <Link href={`/profile/${associate.id}`}>
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={associate.avatar} alt={associate.name} />
                                                <AvatarFallback>{associate.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                           </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{associate.name} ({associate.role})</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                    </div>
                )}
            </CardFooter>
          </Card>

          <Separator className="my-8" />

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
               <h3 className="text-xl font-bold font-headline mb-4">Collaboration Thread</h3>
               <Card>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {(task.messages || []).length === 0 ? (
                                <p className="text-muted-foreground text-center">No messages yet. Start the conversation!</p>
                            ) : (
                                (task.messages || []).map(message => {
                                    const sender = taskUsers.find(u => u.id === message.userId);
                                    const isCurrentUserMsg = sender?.id === currentUser.id;
                                    return (
                                        <div key={message.id} className={`flex items-end gap-3 group ${isCurrentUserMsg ? 'justify-end' : ''}`}>
                                             {!isCurrentUserMsg && sender && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={sender?.avatar} />
                                                    <AvatarFallback>{sender?.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn(
                                                'p-3 rounded-lg max-w-md relative flex flex-col', 
                                                isCurrentUserMsg ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                                                )}>
                                                 {!isCurrentUserMsg && <p className="text-xs font-bold mb-1 text-primary">{sender?.name}</p>}
                                                {message.replyTo && (
                                                    <div className="border-l-2 border-primary-foreground/30 dark:border-primary/50 pl-2 mb-2 text-xs opacity-80 bg-black/10 dark:bg-white/10 p-2 rounded-md">
                                                        <p className="font-semibold">{message.replyTo.userName}</p>
                                                        <p className="truncate italic">"{message.replyTo.text}"</p>
                                                    </div>
                                                )}
                                                {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
                                                {message.voiceNote && (
                                                  <div className='mt-2'>
                                                    <audio src={message.voiceNote.url} controls className='w-full h-10' />
                                                  </div>
                                                )}
                                                <p className="text-xs opacity-70 mt-1.5 self-end">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</p>
                                                 {canChat && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="absolute -top-3 -right-3 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                                                        onClick={() => setReplyTo(message)}
                                                    >
                                                        <MessageSquareQuote className="h-4 w-4 text-foreground"/>
                                                    </Button>
                                                )}
                                            </div>
                                             {isCurrentUserMsg && sender && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={sender?.avatar} />
                                                    <AvatarFallback>{sender?.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start p-4 border-t">
                       {canChat ? (
                           <MessageInput 
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            task={task}
                            replyTo={replyTo}
                            onClearReply={() => setReplyTo(null)}
                            onSendMessage={handleSendMessage}
                           />
                       ) : (
                           <p className="text-center text-muted-foreground w-full">This task is complete. The chat is now read-only.</p>
                       )}
                    </CardFooter>
               </Card>
            </div>
            
            <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline">Actions</h3>
                {canComplete && (
                  <Card>
                    <CardHeader>
                        <CardTitle>Complete Task</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Once all requirements are met, you can mark this task as completed.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleCompleteTask}>
                            <Check className="mr-2 h-4 w-4" /> Mark as Complete
                        </Button>
                    </CardFooter>
                  </Card>
                )}
                 {canUnmarkComplete && (
                    <Card>
                      <CardHeader>
                          <CardTitle>Re-Open Task</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground">This task was marked complete. You can revert it to "In Progress".</p>
                      </CardContent>
                      <CardFooter>
                          <Button className="w-full" variant="secondary" onClick={handleUnmarkComplete}>
                              <Undo2 className="mr-2 h-4 w-4" /> Unmark as Complete
                          </Button>
                      </CardFooter>
                    </Card>
                  )}
                 {canTransfer && (
                    <TransferTaskCard task={task} currentUser={currentUser} onTaskUpdate={onTaskUpdate}/>
                 )}
                <DocumentCard task={task} currentUser={currentUser} onTaskUpdate={onTaskUpdate}/>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

type RecordingStatus = 'idle' | 'recording' | 'paused';

function MessageInput({newMessage, setNewMessage, task, replyTo, onClearReply, onSendMessage }: {
    newMessage: string;
    setNewMessage: (msg: string) => void;
    task: Task;
    replyTo: Message | null;
    onClearReply: () => void;
    onSendMessage: (voiceNoteUrl?: string) => Promise<void>;
}) {
    const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const { toast } = useToast();

    const handleSendMessage = async (voiceNoteUrl?: string) => {
        await onSendMessage(voiceNoteUrl);
        setNewMessage('');
    }

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
                    const downloadURL = await uploadFile(new File([audioBlob], "voice-note.webm"), `tasks/${task.id}/voice-notes`);
                    await handleSendMessage(downloadURL);
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
    
    return (
      <>
        {replyTo && (
        <div className="w-full bg-muted p-2 rounded-t-md flex justify-between items-center text-sm">
            <div className="truncate">
                Replying to <span className="font-semibold">{replyTo.userName}</span>: 
                <span className="text-muted-foreground ml-1 italic">"{replyTo.text}"</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearReply}>
                <X className="h-4 w-4" />
            </Button>
        </div>
        )}
        <div className="w-full flex gap-2 items-end">
            <Textarea 
                placeholder="Type your message here..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                className={cn("flex-1", replyTo ? 'rounded-t-none' : '')}
                rows={1}
            />
             <div className="flex gap-2">
                <Button onClick={() => handleSendMessage()} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
                {recordingStatus === 'idle' && (
                    <Button type="button" variant="outline" size="icon" onClick={startRecording}>
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
      </>
    )
}


function DocumentCard({ task, currentUser, onTaskUpdate }: { task: Task; currentUser: User; onTaskUpdate: (update: Partial<Task>) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        getUsers().then(setAllUsers);
    }, [])

    const handleUpload = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            toast({ variant: "destructive", title: "No files selected." });
            return;
        }

        setUploading(true);
        try {
            const uploadPromises = selectedFiles.map(file => uploadFile(file, `tasks/${task.id}/documents`));
            const downloadURLs = await Promise.all(uploadPromises);

            const newDocuments: Document[] = selectedFiles.map((file, index) => ({
                id: `doc_${Date.now()}_${index}`,
                name: file.name,
                url: downloadURLs[index],
                uploadedBy: currentUser.id,
                createdAt: new Date().toISOString(),
            }));

            const updatedDocuments = [...(task.documents || []), ...newDocuments];
            await onTaskUpdate({ documents: updatedDocuments });
            
            toast({ title: "Documents uploaded!", description: `${selectedFiles.length} file(s) added.` });
            setSelectedFiles([]);
            setOpen(false);
        } catch (error) {
            console.error("Failed to upload document:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the document(s)." });
        } finally {
            setUploading(false);
        }
    }
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Shared Documents</CardTitle>
                 {task.status !== 'Completed' && (
                     <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload New Document(s)</DialogTitle>
                                <DialogDescription>These will be shared with everyone on this task.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <FileUploader
                                    value={selectedFiles}
                                    onValueChange={setSelectedFiles}
                                    dropzoneOptions={{
                                        accept: {
                                            'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                                            'application/pdf': ['.pdf'],
                                            'application/msword': ['.doc'],
                                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                                            'application/vnd.ms-excel': ['.xls'],
                                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                            'application/vnd.ms-powerpoint': ['.ppt'],
                                            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
                                        },
                                        maxSize: 10 * 1024 * 1024, // 10MB per file
                                    }}
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || uploading}>
                                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                     </Dialog>
                 )}
            </CardHeader>
            <CardContent>
                {(task.documents || []).length > 0 ? (
                    <ul className="space-y-3">
                        {(task.documents || []).map(doc => {
                           const uploader = allUsers.find(u => u.id === doc.uploadedBy);
                           return (
                             <li key={doc.id} className="flex items-center justify-between text-sm">
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
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No documents have been shared yet.</p>
                )}
            </CardContent>
        </Card>
    );
}

function TransferTaskCard({ task, currentUser, onTaskUpdate }: { task: Task; currentUser: User; onTaskUpdate: (update: Partial<Task>) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [otherAssociates, setOtherAssociates] = useState<User[]>([]);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        getUsers().then(allUsers => {
            const unassignedAssociates = allUsers.filter(u => u.role === 'Associate' && u.id !== currentUser.id && !task.assignedTo.includes(u.id) && !u.isOnHoliday);
            setOtherAssociates(unassignedAssociates);
        });
    }, [task, currentUser.id]);


    const handleTransfer = async () => {
        if (!selectedAssociate) {
            toast({ variant: 'destructive', title: "No associate selected!" });
            return;
        }

        const newAssignedTo = task.assignedTo.filter(id => id !== currentUser.id);
        newAssignedTo.push(selectedAssociate);
        
        await onTaskUpdate({ assignedTo: newAssignedTo });
        
        toast({ title: 'Task Transferred Successfully!' });
        setOpen(false);
        setSelectedAssociate('');
        router.push('/dashboard');
    };

    const handleOpenToAll = async () => {
        const newAssignedTo = task.assignedTo.filter(id => id !== currentUser.id);
        const newStatus = newAssignedTo.length === 0 ? 'Open' : task.status;
        await onTaskUpdate({ assignedTo: newAssignedTo, status: newStatus });
        
        toast({ title: 'You have left the task.', description: 'It is now available for others to accept.' });
        router.push('/dashboard');
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transfer or Leave Task</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Transfer to a colleague or make it available for anyone to accept.</p>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={otherAssociates.length === 0}><Replace className="mr-2 h-4 w-4"/> Transfer to Colleague</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Transfer task to another Associate</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <p>Select an associate to take over this task. You will be unassigned.</p>
                             <Select onValueChange={setSelectedAssociate} value={selectedAssociate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an associate..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {otherAssociates.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                             <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={user.avatar} alt={user.name} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span>{user.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleTransfer} disabled={!selectedAssociate}>Confirm Transfer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="destructive"><Globe className="mr-2 h-4 w-4"/> Leave & Open to All</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will unassign you from the task. It will become available for other associates to accept. Are you sure you want to proceed?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction onClick={handleOpenToAll}>Yes, Leave Task</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

    

    
