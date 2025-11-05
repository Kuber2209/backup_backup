
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPitches, getUsers } from '@/services/firestore';
import type { Pitch, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

const statusStyles: { [key: string]: string } = {
  'Open': 'bg-primary/10 text-primary border-primary/20',
  'Assigned': 'bg-accent/10 text-accent border-accent/20',
  'Pitched': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function PitchingLogDashboard() {
  const { user: currentUser } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);
  const [associateFilterOpen, setAssociateFilterOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribePitches = getPitches((allPitches) => {
        setPitches(allPitches);
        getUsers().then(allUsers => {
            setUsers(allUsers);
            setLoading(false);
        });
    });

    return () => unsubscribePitches();
  }, []);

  const associates = useMemo(() => {
    return users.filter(u => u.role === 'Associate');
  }, [users]);
  
  const filteredPitches = useMemo(() => {
      return pitches.filter(pitch => {
          const searchMatch = searchTerm.trim() === '' ||
              pitch.companyName.toLowerCase().includes(searchTerm.toLowerCase());

          const associateMatch = selectedAssociates.length === 0 ||
              (pitch.assignedTo && selectedAssociates.includes(pitch.assignedTo));

          return searchMatch && associateMatch;
      });
  }, [pitches, searchTerm, selectedAssociates]);

  if (loading) {
      return (
           <div>
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-12 w-full mb-6" />
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
      );
  }

  if (currentUser?.role === 'Associate') {
    return null;
  }

  return (
    <div>
        <div className="mb-4">
            <h2 className="text-2xl font-bold font-headline tracking-tight">Pitching Log</h2>
            <p className="text-muted-foreground">Monitor the status of all company pitches.</p>
        </div>

         <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 border rounded-lg bg-card">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
            <div className="flex-1 sm:flex-none sm:w-72">
                <Popover open={associateFilterOpen} onOpenChange={setAssociateFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={associateFilterOpen}
                            className="w-full justify-between"
                        >
                        {selectedAssociates.length > 0 ? `${selectedAssociates.length} associate(s) selected` : "Filter by associate..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Search associates..." />
                            <CommandEmpty>No associates found.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                {associates.map((associate) => (
                                    <CommandItem
                                        key={associate.id}
                                        value={associate.name}
                                        onSelect={() => {
                                            const newSelected = selectedAssociates.includes(associate.id)
                                                ? selectedAssociates.filter(id => id !== associate.id)
                                                : [...selectedAssociates, associate.id];
                                            setSelectedAssociates(newSelected);
                                        }}
                                    >
                                        <Check
                                            className={cn("mr-2 h-4 w-4", selectedAssociates.includes(associate.id) ? "opacity-100" : "opacity-0")}
                                        />
                                        {associate.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            {(selectedAssociates.length > 0 || searchTerm) && (
                <Button variant="ghost" onClick={() => {
                    setSelectedAssociates([]);
                    setSearchTerm('');
                }}>Clear Filters</Button>
            )}
        </div>

        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPitches.map(pitch => {
                        const assignedUser = users.find(u => u.id === pitch.assignedTo);
                        const createdByUser = users.find(u => u.id === pitch.createdBy);
                        return (
                            <TableRow key={pitch.id}>
                                <TableCell className="font-medium">{pitch.companyName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(statusStyles[pitch.status])}>
                                        {pitch.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {assignedUser ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={assignedUser.avatar} />
                                                <AvatarFallback>{assignedUser.name.slice(0, 1)}</AvatarFallback>
                                            </Avatar>
                                            <span>{assignedUser.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic">Unassigned</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                     {createdByUser ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={createdByUser.avatar} />
                                                <AvatarFallback>{createdByUser.name.slice(0, 1)}</AvatarFallback>
                                            </Avatar>
                                            <span>{createdByUser.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic">Unknown</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                    <p>Created: {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}</p>
                                    {pitch.pitchedAt && <p>Pitched: {formatDistanceToNow(new Date(pitch.pitchedAt), { addSuffix: true })}</p>}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
             {filteredPitches.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    No pitches match your filters.
                </div>
            )}
        </div>
    </div>
  );
}
