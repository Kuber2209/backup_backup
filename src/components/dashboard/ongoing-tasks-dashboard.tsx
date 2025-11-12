
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { User, Task } from '@/lib/types';
import { TaskList } from './task-list';
import { useAuth } from '@/lib/auth-provider';
import { getOngoingTasks, getUsers } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';


export function OngoingTasksDashboard() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = getOngoingTasks((ongoingTasks) => {
      setTasks(ongoingTasks);
      getUsers().then(allUsers => {
        setUsers(allUsers);
        setLoading(false);
      });
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  const allTags = useMemo(() => {
      const tags = new Set<string>();
      tasks.forEach(task => task.tags.forEach(tag => tags.add(tag)));
      return Array.from(tags);
  }, [tasks]);

  const jptIds = useMemo(() => users.filter(u => u.role === 'JPT').map(u => u.id), [users]);
  const associateIds = useMemo(() => users.filter(u => u.role === 'Associate').map(u => u.id), [users]);
  
  const filteredTasks = useMemo(() => {
    if (!currentUser || users.length === 0) return { jptTasks: [], associateTasks: [] };
    
    let baseTasks = tasks.filter(task => {
        const searchMatch = searchTerm.trim() === '' || 
                            task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const tagsMatch = selectedTags.length === 0 || selectedTags.every(tag => task.tags.includes(tag));
        
        return searchMatch && tagsMatch;
    });

    if (currentUser.role === 'JPT') {
       return {
         jptTasks: [], // JPTs only see associate tasks
         associateTasks: baseTasks.filter(task => task.assignedTo.some(id => associateIds.includes(id)))
       };
    } else if (currentUser.role === 'SPT') {
      return {
        jptTasks: baseTasks.filter(task => task.assignedTo.some(id => jptIds.includes(id))),
        associateTasks: baseTasks.filter(task => task.assignedTo.some(id => associateIds.includes(id)))
      };
    }

    return { jptTasks: [], associateTasks: [] };

  }, [tasks, currentUser, users, searchTerm, selectedTags, jptIds, associateIds]);

  const title = 'Live Task Monitor';
  const description = "A real-time overview of all tasks currently in progress.";
  
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
      
      <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 border rounded-lg bg-card">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search tasks by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
            />
         </div>
         <div className="flex-1 sm:flex-none sm:w-72">
             <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagPopoverOpen}
                    className="w-full justify-between"
                  >
                   {selectedTags.length > 0 ? `${selectedTags.length} tag(s) selected` : "Filter by tags..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                        {allTags.map((tag) => (
                            <CommandItem
                                key={tag}
                                value={tag}
                                onSelect={(currentValue) => {
                                    const newSelected = selectedTags.includes(currentValue)
                                        ? selectedTags.filter(t => t !== currentValue)
                                        : [...selectedTags, currentValue];
                                    setSelectedTags(newSelected);
                                }}
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {tag}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
         </div>
         {selectedTags.length > 0 && (
            <Button variant="ghost" onClick={() => setSelectedTags([])}>Clear Filters</Button>
         )}
      </div>

       {selectedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
                {selectedTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
        )}

      {currentUser.role === 'SPT' && (
        <div className='space-y-8'>
            <div>
                <h3 className="text-xl font-bold font-headline mb-4">JPTs In-Progress ({filteredTasks.jptTasks.length})</h3>
                <TaskList tasks={filteredTasks.jptTasks} users={users} />
            </div>
            <Separator />
            <div>
                <h3 className="text-xl font-bold font-headline mb-4">Associates In-Progress ({filteredTasks.associateTasks.length})</h3>
                <TaskList tasks={filteredTasks.associateTasks} users={users} />
            </div>
        </div>
      )}

      {currentUser.role === 'JPT' && (
         <TaskList tasks={filteredTasks.associateTasks} users={users} />
      )}
      
    </div>
  );
}
