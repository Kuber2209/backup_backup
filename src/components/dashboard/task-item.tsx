
'use client';

import { Check, User as UserIcon, Calendar, Tag, Users, ArrowRight, Clock, MoreVertical, Edit, Trash2 } from 'lucide-react';
import type { Task, User, AssignableRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { updateTask, deleteTask } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { CreateTaskForm } from './create-task-form';
import { Dialog } from '../ui/dialog';

interface TaskItemProps {
  task: Task;
  users: User[]; // This should contain all users to find author/assignees
  onTaskUpdate?: (updatedTask: Task) => void;
}

const statusStyles: { [key: string]: string } = {
  'Open': 'bg-primary/10 text-primary border-primary/20',
  'In Progress': 'bg-accent/10 text-accent border-accent/20',
  'Completed': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function TaskItem({ task, users, onTaskUpdate }: TaskItemProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const createdBy = users.find(u => u.id === task.createdBy);
  const assignedUsers = users.filter(u => task.assignedTo.includes(u.id));
  const isDeadlinePast = task.deadline ? isPast(new Date(task.deadline)) : false;

  const handleAcceptTask = async () => {
    if (!currentUser) return;
    const newAssignedTo = [...task.assignedTo, currentUser.id];
    
    // Change status to "In Progress" as soon as one person accepts
    const newStatus = 'In Progress';
    
    const updatedTaskData = { status: newStatus, assignedTo: newAssignedTo };
    
    await updateTask(task.id, updatedTaskData);
    
    toast({ title: "Task Accepted!", description: "You've been assigned to the task." });
  };

  const handleCompleteTask = async () => {
    const updatedTaskData = { status: 'Completed' as const, completedAt: new Date().toISOString() };
    await updateTask(task.id, updatedTaskData);
     toast({ title: "Task Completed!", description: "Great work!" });
  };
  
  if (!currentUser) return null;

  const isUserAssigned = task.assignedTo.includes(currentUser.id);
  const isAssignable = task.assignableTo.includes(currentUser.role as AssignableRole);
  
  const assignedRolesCount = useMemo(() => {
    return assignedUsers.reduce((acc, user) => {
        if(user.role === 'JPT') acc.jptCount++;
        if(user.role === 'Associate') acc.associateCount++;
        return acc;
    }, { jptCount: 0, associateCount: 0});
  }, [assignedUsers]);

  const canAccept = useMemo(() => {
    if (task.status !== 'Open' || isUserAssigned || !isAssignable) return false;
    if (currentUser.role === 'JPT') {
        return task.requiredJpts ? assignedRolesCount.jptCount < task.requiredJpts : false;
    }
    if (currentUser.role === 'Associate') {
        return task.requiredAssociates ? assignedRolesCount.associateCount < task.requiredAssociates : false;
    }
    return false;
  }, [task, currentUser, isUserAssigned, isAssignable, assignedRolesCount]);

  const canComplete = (task.status !== 'In Progress' && task.status !== 'Open') && isUserAssigned;
  const isCreator = task.createdBy === currentUser.id;
  const canViewDetails = true; // Everyone can view details now
  const canManage = currentUser.role === 'SPT' || (currentUser.role === 'JPT' && isCreator);

  const assignedJptsCount = assignedUsers.filter(u => u.role === 'JPT').length;
  const assignedAssociatesCount = assignedUsers.filter(u => u.role === 'Associate').length;


  return (
    <Card className="flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] task-card">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="font-headline text-lg mb-2">{task.title}</CardTitle>
            <div className='flex items-center'>
              <Badge variant="outline" className={cn('whitespace-nowrap badge-squish', statusStyles[task.status])}>{task.status}</Badge>
              {canManage && <TaskActions task={task} />}
            </div>
        </div>
        <CardDescription className="line-clamp-2">{task.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {task.deadline && (
           <div className={cn(
               "flex items-center text-sm",
               isDeadlinePast && task.status !== 'Completed' ? "text-destructive" : "text-muted-foreground"
            )}>
              <Clock className="w-4 h-4 mr-2" />
              Deadline: {format(new Date(task.deadline), 'PPP p')}
              {isDeadlinePast && task.status !== 'Completed' && <Badge variant="destructive" className="ml-2 badge-squish">Overdue</Badge>}
           </div>
        )}
        <div className="flex items-center text-sm text-muted-foreground">
          <Tag className="w-4 h-4 mr-2" />
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => <Badge variant="secondary" key={tag} className="badge-squish">{tag}</Badge>)}
          </div>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </div>
        {createdBy && (
          <div className="flex items-center text-sm text-muted-foreground">
            <UserIcon className="w-4 h-4 mr-2" />
            Posted by {task.isAnonymous ? `a ${createdBy.role}` : createdBy.name}
          </div>
        )}
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          <span>
            {task.requiredJpts ? <span>{assignedJptsCount}/{task.requiredJpts} JPTs</span> : ''}
            {task.requiredJpts && task.requiredAssociates ? <span> & </span> : ''}
            {task.requiredAssociates ? <span>{assignedAssociatesCount}/{task.requiredAssociates} Associates</span> : ''}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 pt-4 mt-auto border-t">
        {assignedUsers.length > 0 && (
            <div className="w-full">
                <p className="text-sm font-medium mb-2">Assigned to:</p>
                <div className="flex flex-wrap gap-2">
                    {assignedUsers.map(associate => (
                         <TooltipProvider key={associate.id}>
                            <Tooltip>
                                <TooltipTrigger>
                                  <Link href={`/profile/${associate.id}`}>
                                    <Avatar className="h-8 w-8 transition-transform hover:scale-110">
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
        <div className="w-full pt-4 border-t flex flex-col gap-2">
            {canAccept && <Button onClick={handleAcceptTask} className="w-full bg-accent hover:bg-accent/90 btn-bounce">Accept Task</Button>}
            {canComplete && <Button onClick={handleCompleteTask} className="w-full btn-bounce"><Check className="mr-2 h-4 w-4" />Mark as Complete</Button>}
            {canViewDetails && (
              <Button asChild variant="outline" className="w-full btn-bounce">
                <Link href={`/task/${task.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            )}
            {!canAccept && !canComplete && !canViewDetails && (
                 <p className="text-sm text-center text-muted-foreground w-full">No actions available for you.</p>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}

function TaskActions({ task }: { task: Task }) {
    const { toast } = useToast();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteTask(task.id);
            toast({ title: "Task Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the task." });
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
                            This action cannot be undone. This will permanently delete the task "{task.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
               {editOpen && <CreateTaskForm isEdit task={task} onOpenChange={setEditOpen} />}
            </Dialog>
        </>
    )
}
