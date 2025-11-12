
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { User, Task } from '@/lib/types';
import { TaskList } from './task-list';
import { useAuth } from '@/lib/auth-provider';
import { getOpenTasks, getUsers } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';

export function AssociateDashboard() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = getOpenTasks((openTasks) => {
      setTasks(openTasks);
      getUsers().then(allUsers => {
        setUsers(allUsers);
        setLoading(false);
      });
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  const tasksToDisplay = useMemo(() => {
    if (!currentUser || users.length === 0) return [];
    
    return tasks.filter(task => {
      // User must not already be assigned
      if (task.assignedTo.includes(currentUser.id)) return false;
      
      // The user's role must be in the assignable roles
      if (!task.assignableTo.includes(currentUser.role)) return false;

      // Check if there is space for the user's role
      const assignedUsers = users.filter(u => task.assignedTo.includes(u.id));
      const assignedCountForRole = assignedUsers.filter(u => u.role === currentUser.role).length;
      
      if (currentUser.role === 'JPT') {
          return task.requiredJpts ? assignedCountForRole < task.requiredJpts : false;
      }
      if (currentUser.role === 'Associate') {
          return task.requiredAssociates ? assignedCountForRole < task.requiredAssociates : false;
      }

      return false;
    });
  }, [tasks, currentUser, users]);

  const title = 'Available Tasks';
  const description = "Tasks you can accept to work on.";
  
  if (!currentUser) return null;
  
  if (loading) {
       return (
          <div>
            <div className="mb-4">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
             </div>
          </div>
      )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold font-headline tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <TaskList tasks={tasksToDisplay} users={users} />
    </div>
  );
}
