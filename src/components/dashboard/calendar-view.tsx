
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Task } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';
import { getCalendarTasksForUser } from '@/services/firestore';
import { format, isSameDay, isPast, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '../ui/card';


export function CalendarView() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = getCalendarTasksForUser(currentUser.id, (userTasks) => {
      setTasks(userTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const deadlines = useMemo(() => {
    const deadlineMap = new Map<string, boolean>();
    tasks.forEach((task) => {
      if (task.deadline) {
        deadlineMap.set(format(new Date(task.deadline), 'yyyy-MM-dd'), true);
      }
    });
    return deadlineMap;
  }, [tasks]);

  const tasksForSelectedDay = useMemo(() => {
    return tasks
      .filter(task => task.deadline && isSameDay(new Date(task.deadline), selectedDate))
      .sort((a,b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [tasks, selectedDate]);
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };
  
  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startingDayIndex = getDay(start);
    
    const paddingDays = Array.from({ length: startingDayIndex }, (_, i) => {
      return null;
    });

    return [...paddingDays, ...days];
  }, [currentMonth]);
  
  if (loading) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
          <div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>
    );
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-2 rounded-2xl shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="btn-bounce">
                    <ChevronLeft />
                </Button>
                <h2 className="text-xl font-semibold text-card-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="btn-bounce">
                    <ChevronRight />
                </Button>
            </div>
            <div className="grid grid-cols-7 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs font-medium text-muted-foreground py-2">{day}</div>
                ))}

                {daysInMonth.map((day, index) => {
                    if (!day) return <div key={`padding-${index}`}></div>;

                    const dayKey = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const hasDeadline = deadlines.has(dayKey);
                    
                    return (
                         <div key={dayKey}>
                            <button
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "w-10 h-10 flex items-center justify-center rounded-full mx-auto relative transition-transform duration-300 ease-out",
                                    "hover:-translate-y-1 hover:scale-110",
                                    {
                                        "bg-primary text-primary-foreground font-semibold shadow-lg scale-110": isSelected,
                                        "hover:bg-muted": !isSelected,
                                        "text-muted-foreground": isPast(day) && !isToday(day) && !isSelected,
                                        "font-bold text-primary": isToday(day) && !isSelected,
                                        "has-deadline": hasDeadline && !isSelected
                                    }
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </Card>

        <Card className="rounded-2xl shadow-sm p-6 space-y-6 bg-card">
            <h2 className="text-xl font-semibold text-card-foreground">Deadlines for {format(selectedDate, 'MMMM do')}</h2>
            <div className="space-y-4">
                {tasksForSelectedDay.length > 0 ? (
                  tasksForSelectedDay.map((task, index) => (
                    <TaskCard key={task.id} task={task} index={index} />
                  ))
                ) : (
                    <p className="text-center text-muted-foreground pt-10">No deadlines on this day.</p>
                )}
            </div>
        </Card>
    </main>
  );
}

function TaskCard({ task, index }: { task: Task, index: number }) {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'Completed';

  const statusStyles: {[key:string]: string} = {
    'Completed': 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900/50',
    'In Progress': 'text-yellow-700 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/50',
    'Open': 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50',
  }

  return (
    <div className="task-card p-4 bg-muted/50 rounded-lg" style={{ animationDelay: `${index * 100}ms` }}>
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-semibold text-card-foreground">{task.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
            </div>
            <span className={cn("badge-squish text-xs font-medium py-1 px-2 rounded-full", statusStyles[task.status])}>
              {task.status}
              {isOverdue && ' (Overdue)'}
            </span>
        </div>
        <div className="flex justify-between items-end mt-4">
            <div className="flex items-center space-x-2">
                <Clock className="text-muted-foreground w-4 h-4" />
                <span className="text-sm text-muted-foreground">
                    {task.deadline ? format(new Date(task.deadline), 'p') : 'No time set'}
                </span>
            </div>
             <Button variant="link" size="sm" asChild className="btn-bounce">
                <Link href={`/task/${task.id}`}>View Task</Link>
            </Button>
        </div>
    </div>
  )
}
