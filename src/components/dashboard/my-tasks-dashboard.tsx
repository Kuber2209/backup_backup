
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import type { User, Task } from '@/lib/types';
import { TaskList } from './task-list';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, CircleDotDashed } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { getTasksAssignedToUser, getUsers, updateTask } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';


export function MyTasksDashboard() {
  const { user: currentUser } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = getTasksAssignedToUser(currentUser.id, (tasks) => {
        setAssignedTasks(tasks);
        getUsers().then(setUsers).finally(() => setLoading(false));
    });
    
    return () => unsubscribe();
  }, [currentUser]);


  const handleTaskUpdate = async (updatedTask: Task) => {
    await updateTask(updatedTask.id, updatedTask);
  };

  const { ongoingTasks, completedTasks } = useMemo(() => {
    return {
      ongoingTasks: assignedTasks.filter(task => task.status !== 'Completed'),
      completedTasks: assignedTasks.filter(task => task.status === 'Completed'),
    };
  }, [assignedTasks]);

  if (!currentUser) return null;
  
  if (loading) {
      return (
          <div>
            <div className="mb-6">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-72 mb-4" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
             <div>
                <Skeleton className="h-8 w-56 mb-2" />
                <Skeleton className="h-4 w-64 mb-4" />
                <Skeleton className="h-12 w-full" />
             </div>
          </div>
      )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-headline tracking-tight mb-2">My Ongoing Tasks</h2>
        <p className="text-muted-foreground">Tasks that are currently open or in progress.</p>
        <TaskList tasks={ongoingTasks} users={users} onTaskUpdate={handleTaskUpdate} />
      </div>

      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight mb-2">Completed Tasks</h2>
        <p className="text-muted-foreground mb-4">Tasks you have successfully completed.</p>
        
        {completedTasks.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="completed-tasks">
              <AccordionTrigger className="text-base font-medium bg-muted/50 px-4 rounded-md">
                <div className='flex items-center gap-2'>
                    <CheckCircle2 className='w-5 h-5 text-green-600'/>
                    <span>View {completedTasks.length} Completed Task(s)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <Card>
                    <CardContent className="p-4 space-y-3">
                        {completedTasks.map(task => (
                        <div key={task.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
                            <p className="font-medium">{task.title}</p>
                            {task.completedAt && (
                            <p className="text-sm text-muted-foreground">
                                Completed on {format(new Date(task.completedAt), 'PPP')}
                            </p>
                            )}
                        </div>
                        ))}
                    </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-48 bg-card">
                <CircleDotDashed className="w-10 h-10 text-muted-foreground" />
                <h3 className="text-xl font-bold tracking-tight font-headline mt-4">No Completed Tasks</h3>
                <p className="text-sm text-muted-foreground">Finish a task to see it here.</p>
            </div>
        )}
      </div>
    </div>
  );
}
