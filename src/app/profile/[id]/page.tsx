

'use client';

import { useParams, useRouter } from 'next/navigation';
import type { User, Task } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, Upload, Camera, ShieldAlert, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-provider';
import { getUserProfile, getTasksAssignedToUser, updateUserProfile } from '@/services/firestore';
import { uploadFile } from '@/services/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


export default function ProfilePage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;
    const { user: currentUser, loading: authLoading, setUser } = useAuth();
    
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userId) return;

        if (!authLoading && !currentUser) {
            router.push('/login');
            return;
        }

        if (currentUser) {
            setLoading(true);
            const fetchProfileData = async () => {
                try {
                    // Fetch user profile and set up task listener concurrently
                    const profilePromise = getUserProfile(userId);
                    const unsubscribePromise = new Promise<() => void>((resolve) => {
                        const unsubscribe = getTasksAssignedToUser(userId, (tasks) => {
                            setAssignedTasks(tasks);
                            resolve(unsubscribe); // Resolve the promise with the unsubscribe function
                        });
                    });

                    const [user, unsubscribe] = await Promise.all([profilePromise, unsubscribePromise]);
                    
                    setProfileUser(user);
                    setLoading(false);
                    
                    return unsubscribe;
                } catch (err) {
                    console.error("Failed to load profile", err);
                    setLoading(false);
                    return () => {};
                }
            };

            const unsubscribePromise = fetchProfileData();

            return () => {
                unsubscribePromise.then(unsub => {
                    if (unsub) {
                        unsub();
                    }
                });
            };
        }

    }, [userId, authLoading, currentUser, router]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profileUser) return;

        try {
            const avatarUrl = await uploadFile(file, `avatars/${profileUser.id}`);
            await updateUserProfile(profileUser.id, { avatar: avatarUrl });
            
            const updatedProfile = { ...profileUser, avatar: avatarUrl };
            setProfileUser(updatedProfile);

            // If the user is updating their own avatar, update the global auth context
            if (currentUser?.id === profileUser.id) {
                setUser(updatedProfile);
            }

            toast({ title: "Avatar updated!" });
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            toast({ variant: "destructive", title: "Upload Failed" });
        }
    };

    const handleHolidayModeToggle = async (checked: boolean) => {
        if (!profileUser) return;
        try {
            await updateUserProfile(profileUser.id, { isOnHoliday: checked });
            
            const updatedProfile = { ...profileUser, isOnHoliday: checked };
            setProfileUser(updatedProfile);
            
            if (currentUser?.id === profileUser.id) {
                setUser(updatedProfile);
            }

            toast({ title: `Holiday mode ${checked ? 'enabled' : 'disabled'}.` });
        } catch (error) {
            console.error("Failed to update holiday mode:", error);
            toast({ variant: "destructive", title: "Update Failed" });
        }
    };
    
    const { ongoingTasks, completedTasks } = useMemo(() => {
        return {
            ongoingTasks: assignedTasks.filter(task => task.status !== 'Completed'),
            completedTasks: assignedTasks.filter(task => task.status === 'Completed'),
        };
    }, [assignedTasks]);

    if (authLoading || loading) {
      return <div className="flex min-h-screen w-full items-center justify-center"><p>Loading profile...</p></div>
    }
    
    if (!currentUser) {
        return null;
    }
    
    if (!profileUser) {
        return <div className="flex min-h-screen w-full items-center justify-center"><p>User not found.</p></div>
    }
    
    const canViewProfile = 
        currentUser.role === 'SPT' || 
        (currentUser.role === 'JPT' && profileUser.role === 'Associate') ||
        currentUser.id === profileUser.id;
    
    const isOwnProfile = currentUser.id === profileUser.id;

    if (!canViewProfile) {
        return (
             <div className="flex min-h-screen w-full flex-col">
              <Header />
              <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
                  <h1 className="text-2xl font-bold">Access Denied</h1>
                  <p>You are not authorized to view this profile.</p>
                  <Button onClick={() => router.push('/dashboard')} className="btn-bounce">Go to Dashboard</Button>
              </main>
          </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
                    
                    {/* Left Column - Profile Card */}
                    <div className="md:col-span-1 space-y-6">
                        <Button variant="ghost" onClick={() => router.back()} className="btn-bounce -ml-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>

                        <Card>
                            <CardHeader className="items-center">
                                 <div className="relative group">
                                    <Avatar className="h-32 w-32 border-4 border-primary">
                                        <AvatarImage src={profileUser.avatar} alt={profileUser.name} />
                                        <AvatarFallback className="text-4xl">{profileUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {isOwnProfile && (
                                        <Button 
                                            size="icon" 
                                            variant="secondary"
                                            className="absolute bottom-1 right-1 h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Camera className="h-5 w-5"/>
                                        </Button>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                                </div>
                                <div className='text-center pt-4'>
                                    <CardTitle className="font-headline text-3xl">{profileUser.name}</CardTitle>
                                    <CardDescription className="text-base flex items-center justify-center gap-2 mt-2">
                                        <Badge variant={profileUser.role === 'JPT' ? 'default' : 'secondary'} className="badge-squish">{profileUser.role}</Badge>
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className='flex gap-6 pt-2 justify-center'>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
                                            <p className="text-xs text-muted-foreground">Completed</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-accent">{ongoingTasks.length}</p>
                                            <p className="text-xs text-muted-foreground">In Progress</p>
                                        </div>
                                </div>
                            </CardContent>
                             {isOwnProfile && (profileUser.role === 'Associate' || profileUser.role === 'JPT') && (
                                <CardFooter className="flex-col gap-4">
                                     <Separator />
                                     <div className="flex items-center space-x-2 justify-between w-full">
                                        <Label htmlFor="holiday-mode" className="flex flex-col">
                                            <span className="font-semibold">On Holiday</span>
                                            <span className="text-xs text-muted-foreground">Unavailable for new tasks</span>
                                        </Label>
                                        <Switch
                                            id="holiday-mode"
                                            checked={profileUser.isOnHoliday}
                                            onCheckedChange={handleHolidayModeToggle}
                                        />
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                        {profileUser.isOnHoliday && (
                             <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50">
                                <CardContent className="p-4 flex items-start gap-4">
                                    {profileUser.role === 'Associate' ? <Sun className="h-5 w-5 mt-1 text-yellow-600 dark:text-yellow-400" /> : <Moon className="h-5 w-5 mt-1 text-yellow-600 dark:text-yellow-400" /> }
                                    <div>
                                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Currently On Holiday</h4>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300/80">{profileUser.name} will not appear for direct task assignments.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Tasks */}
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-bold font-headline mb-4 mt-[52px]">Assigned Tasks</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-accent mb-3">Ongoing ({ongoingTasks.length})</h3>
                                {ongoingTasks.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {ongoingTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No ongoing tasks.</p>
                                )}
                            </div>

                            <Separator />
                            
                            <div>
                                <h3 className="text-lg font-semibold text-green-600 mb-3">Completed ({completedTasks.length})</h3>
                                {completedTasks.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {completedTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}


function TaskCard({ task, index }: { task: Task, index: number }) {
  const isDeadlinePast = task.deadline ? new Date(task.deadline) < new Date() && task.status !== 'Completed' : false;

  return (
    <Card className="task-card" style={{animationDelay: `${index * 100}ms`}}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
            <h4 className="font-semibold mb-2">{task.title}</h4>
            <Badge variant="outline" className={cn(
                'badge-squish',
                task.status === 'Completed' ? 'text-green-600 border-green-600/50' : 
                task.status === 'In Progress' ? 'text-accent border-accent/50' : ''
            )}>{task.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
        
        <div className="flex items-center text-xs text-muted-foreground gap-4">
            {task.status === 'Completed' && task.completedAt && (
                 <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Completed {format(new Date(task.completedAt), 'PPP')}
                 </div>
            )}
             {task.status !== 'Completed' && task.deadline && (
                 <div className={cn('flex items-center gap-1', isDeadlinePast ? 'text-destructive' : '')}>
                    <Clock className="w-3 h-3" />
                    Due {format(new Date(task.deadline), 'PPP')}
                 </div>
            )}
        </div>
      </CardContent>
      <div className="p-4 pt-0">
         <Button variant="secondary" size="sm" asChild className="w-full btn-bounce">
            <Link href={`/task/${task.id}`}>View Details</Link>
        </Button>
      </div>
    </Card>
  );
}
