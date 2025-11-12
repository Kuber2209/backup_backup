
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-provider';
import { Mail, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
    const { logOut, user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logOut();
        router.push('/login');
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <Clock className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="mt-4 font-headline text-2xl">
                        Your Account is Pending Approval
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                        Thank you for signing up! Your account for <strong className='text-foreground'>{user?.email}</strong> is currently waiting for an administrator to approve it.
                    </p>
                    <p>
                        You will not be able to access the dashboard until your account has been approved. Please check back later.
                    </p>
                    <Button onClick={handleLogout}>
                        Return to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
