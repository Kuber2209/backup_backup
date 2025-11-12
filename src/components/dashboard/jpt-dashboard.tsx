
'use client';

import { useState, useEffect } from 'react';
import type { User, Task } from '@/lib/types';
import { CreateTaskForm } from './create-task-form';
import { TaskList } from './task-list';
import { useAuth } from '@/lib/auth-provider';
import { getTasksCreatedByUser, getUsers } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';

export function JptDashboard() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = getTasksCreatedByUser(currentUser.id, (postedTasks) => {
      // Filter out completed tasks
      const activeTasks = postedTasks.filter(task => task.status !== 'Completed');
      setTasks(activeTasks);
      // Also fetch all users for avatar display in tasks
      getUsers().then(allUsers => {
        setUsers(allUsers);
        setLoading(false);
      });
    });
    
    return () => unsubscribe();
  }, [currentUser]);


  if (!currentUser) return null;

  if (loading) {
      return (
          <div>
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
             </div>
          </div>
      )
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-t py-4">
        <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Your Posted Tasks</h2>
            <p className="text-muted-foreground">Manage tasks you have created.</p>
        </div>
        <CreateTaskForm />
      </div>
      <div className="mt-6">
        <TaskList tasks={tasks} users={users} />
      </div>
    </div>
  );
}
