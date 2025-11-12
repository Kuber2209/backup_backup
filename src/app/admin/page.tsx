
'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { ApprovalQueue } from '@/components/admin/approval-queue';
import { BlacklistManagement } from '@/components/admin/blacklist-management';
import { WhitelistManagement } from '@/components/admin/whitelist-management';

const ADMIN_EMAIL = 'f20240819@hyderabad.bits-pilani.ac.in';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Verifying credentials...</div>;
  }

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive" />
            <h1 className="text-3xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
            <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold font-headline mb-6">Admin Dashboard</h1>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pending User Approvals</CardTitle>
                        <CardDescription>Approve or decline new users who have signed up.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ApprovalQueue />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active User Role Management</CardTitle>
                        <CardDescription>Assign roles to active users. Changes are saved automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <UserManagementTable />
                    </CardContent>
                </Card>
                 <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Whitelist Management</CardTitle>
                            <CardDescription>Add emails to the whitelist for automatic approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <WhitelistManagement />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Blacklist Management</CardTitle>
                            <CardDescription>Add or remove emails from the blacklist to block them from signing up.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BlacklistManagement />
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
      </main>
    </div>
  );
}
