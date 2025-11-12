

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User, Resource, ResourceComment, Document } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Link2, Plus, Loader2, MoreVertical, Edit, Trash2, FileText, Download, Send, MessageSquare, BookMarked, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { createResource, getResources, getUsers, updateResource, deleteResource } from '@/services/firestore';
import { uploadFile } from '@/services/storage';
import { Skeleton } from '../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { FileUploader } from '../ui/file-uploader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';


export function Resources() {
    const { user: currentUser } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLoading(true);
        if (!currentUser) return;
        
        const unsubscribe = getResources((data) => {
            setResources(data);
            setLoading(false);
        });
        
        getUsers().then(setUsers);

        return () => unsubscribe();
    }, [currentUser]);

    const filteredResources = useMemo(() => {
        if (!searchTerm) return resources;
        return resources.filter(resource =>
            resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [resources, searchTerm]);
    
    if (!currentUser) return null;

    const canManage = currentUser.role === 'SPT' || currentUser.role === 'JPT';
    
    if (loading) {
        return (
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-8 w-64" />
                    {canManage && <Skeleton className="h-10 w-44" />}
                </div>
                 <Skeleton className="h-12 w-full mb-6" />
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
                    <h2 className="text-2xl font-bold font-headline tracking-tight">Permanent Resources</h2>
                    <p className="text-muted-foreground">Important documents and links for the team.</p>
                </div>
                {canManage && <CreateResourceForm />}
            </div>

            <div className="relative my-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search resources by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="space-y-6">
                {filteredResources.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} users={users} currentUser={currentUser} canManage={canManage} />
                ))}
                {resources.length > 0 && filteredResources.length === 0 && (
                    <div className="text-center col-span-full py-16">
                        <p className="text-muted-foreground">No resources found matching your search.</p>
                    </div>
                )}
                {resources.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-40 bg-card">
                        <BookMarked className="w-10 h-10 text-muted-foreground" />
                        <h3 className="text-xl font-bold tracking-tight font-headline mt-4">No Resources Yet</h3>
                        <p className="text-sm text-muted-foreground">JPTs and SPTs can add important links or documents here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ResourceCard({ resource, users, currentUser, canManage }: { resource: Resource, users: User[], currentUser: User, canManage: boolean}) {
    const author = users.find(u => u.id === resource.createdBy);
    const [newComment, setNewComment] = useState("");
    const { toast } = useToast();

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const comment: ResourceComment = {
            id: `comment_${Date.now()}`,
            userId: currentUser.id,
            text: newComment,
            createdAt: new Date().toISOString()
        };

        const updatedComments = [...(resource.comments || []), comment];
        await updateResource(resource.id, { comments: updatedComments });
        setNewComment("");
        toast({ title: "Comment added!" });
    };

    return (
        <Collapsible asChild>
            <Card className="transition-all hover:shadow-md">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={author?.avatar} alt={author?.name} />
                                <AvatarFallback>{author?.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="font-headline text-xl">{resource.title}</CardTitle>
                                {author && <p className="text-sm text-muted-foreground">
                                    Added by {author?.name} ({author?.role}) - {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
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
                            {canManage && <ResourceActions resource={resource} />}
                        </div>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        {resource.description && <p className="whitespace-pre-wrap">{resource.description}</p>}
                        
                        <div className='flex items-center gap-4 mt-4'>
                            {resource.link && (
                                <Button variant="outline" size="sm" asChild>
                                    <a href={resource.link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <Link2 className="w-4 h-4"/> <span>{resource.link.name}</span>
                                    </a>
                                </Button>
                            )}
                            {resource.document && (
                                 <Button variant="outline" size="sm" asChild>
                                    <a href={resource.document.url} download={resource.document.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <Download className="w-4 h-4"/> <span>{resource.document.name}</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className='pt-4'>
                        <Accordion type="single" collapsible className="w-full border-t">
                            <AccordionItem value="comments" className="border-b-0">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Comments ({resource.comments?.length || 0})</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {(resource.comments || []).length > 0 ? (resource.comments || []).map(comment => {
                                            const commenter = users.find(u => u.id === comment.userId);
                                            return (
                                                <div key={comment.id} className="flex items-start gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={commenter?.avatar} />
                                                        <AvatarFallback>{commenter?.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="bg-muted p-3 rounded-lg flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-xs font-bold">{commenter?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</p>
                                                        </div>
                                                        <p className="text-sm mt-1">{comment.text}</p>
                                                    </div>
                                                </div>
                                            )
                                        }) : <p className="text-sm text-center text-muted-foreground py-4">No comments yet.</p>}
                                    </div>
                                    <div className="flex gap-2 items-center pt-4 border-t">
                                        <Input 
                                            placeholder="Add a comment..." 
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        />
                                        <Button onClick={handleAddComment} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardFooter>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

const resourceSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().optional(),
  linkUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  linkName: z.string().optional(),
  file: z.array(z.instanceof(File)).optional(),
  document: z.custom<Resource['document']>().optional(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

function CreateResourceForm({ isEdit = false, resource, onFormOpenChange }: { isEdit?: boolean; resource?: Resource, onFormOpenChange?: (open: boolean) => void }) {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const handleOpenChange = (open: boolean) => {
    if (onFormOpenChange) {
      onFormOpenChange(open);
    } else {
      setDialogOpen(open);
    }
  };

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting }, reset } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { title: '', description: '', linkUrl: '', linkName: '', file: [], document: undefined },
  });

  useEffect(() => {
    if (isEdit && resource) {
      reset({ title: resource.title, description: resource.description || '', linkUrl: resource.link?.url || '', linkName: resource.link?.name || '', file: [], document: resource.document });
    } else {
      reset({ title: '', description: '', linkUrl: '', linkName: '', file: [], document: undefined });
    }
  }, [isEdit, resource, reset]);

  const file = watch('file')?.[0];
  const linkUrl = watch('linkUrl');
  
  const onSubmit = async (data: ResourceFormData) => {
    if (!currentUser) return;
    setUploading(true);

    try {
        const finalData: Partial<Omit<Resource, 'id' | 'createdAt' | 'createdBy' | 'comments'>> = {
            title: data.title,
        };

        if (data.description) finalData.description = data.description;
        
        if (data.linkUrl) {
            finalData.link = { url: data.linkUrl, name: data.linkName || data.linkUrl };
        } else {
            finalData.link = undefined;
        }

        if (data.file && data.file.length > 0) {
            const tempId = resource?.id || `temp_${Date.now()}`;
            const downloadURL = await uploadFile(data.file[0], `resources/${tempId}/`);
            finalData.document = { name: data.file[0].name, url: downloadURL };
        } else if (data.document) {
            finalData.document = data.document;
        } else {
            finalData.document = undefined;
        }
        
        const updatePayload: any = { ...finalData };
        if (updatePayload.link === undefined) delete updatePayload.link;
        if (updatePayload.document === undefined) delete updatePayload.document;

        if(isEdit && resource) {
            await updateResource(resource.id, updatePayload);
            toast({ title: 'Resource Updated!' });
        } else {
            const newResourceData: Omit<Resource, 'id'> = {
                title: finalData.title!,
                description: finalData.description || '',
                createdBy: currentUser.id,
                createdAt: new Date().toISOString(),
                comments: [],
            };

            if (finalData.link) newResourceData.link = finalData.link;
            if (finalData.document) newResourceData.document = finalData.document;
            
            await createResource(newResourceData);
            toast({ title: 'Resource Posted!', description: `The resource "${data.title}" is now live.` });
        }
        handleOpenChange(false);
        reset({ title: '', description: '', linkUrl: '', linkName: '', file: [], document: undefined });

    } catch (err) {
         console.error("Failed to save resource:", err);
         toast({variant: 'destructive', title: "An Error Occurred", description: "Could not save the resource."});
    } finally {
        setUploading(false);
    }
  };
  
  return (
    <Dialog open={onFormOpenChange ? undefined : dialogOpen} onOpenChange={handleOpenChange}>
      {!isEdit && (
         <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Resource
            </Button>
        </DialogTrigger>
      )}
     <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="font-headline">{isEdit ? 'Edit Resource' : 'Add a New Resource'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Modify the details below.' : 'Add a link or upload a document.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL (Optional)</Label>
              <Input id="linkUrl" {...register('linkUrl')} placeholder="https://example.com" disabled={!!file} />
              {errors.linkUrl && <p className="text-sm text-destructive">{errors.linkUrl.message}</p>}
            </div>
            {linkUrl && (
                <div className="space-y-2">
                    <Label htmlFor="linkName">Link Name (Optional)</Label>
                    <Input id="linkName" {...register('linkName')} placeholder="e.g. Google Drive Folder" />
                </div>
            )}
            <p className="text-center text-xs text-muted-foreground">OR</p>
            <div className="space-y-2">
                <Label>Upload a Document (Optional)</Label>
                 <Controller
                    control={control}
                    name="file"
                    render={({ field }) => (
                        <FileUploader
                            value={field.value ?? []}
                            onValueChange={(files) => field.onChange(files.slice(0, 1))} // Only allow one file
                            dropzoneOptions={{
                                accept: {
                                    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                                    'application/pdf': ['.pdf'],
                                    'application/msword': ['.doc'],
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                                },
                                maxSize: 10 * 1024 * 1024, // 10MB
                                multiple: false,
                                disabled: !!linkUrl,
                            }}
                        />
                    )}
                />
                 {isEdit && resource?.document && !file && (
                    <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{resource.document.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setValue('document', undefined)}>
                            <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                    </div>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function ResourceActions({ resource }: { resource: Resource }) {
    const [editOpen, setEditOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteResource(resource.id);
            toast({ title: "Resource Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the resource." });
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
                            This action cannot be undone. This will permanently delete the resource titled "{resource.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
               {editOpen && <CreateResourceForm isEdit resource={resource} onFormOpenChange={setEditOpen} />}
            </Dialog>
        </>
    )
}
