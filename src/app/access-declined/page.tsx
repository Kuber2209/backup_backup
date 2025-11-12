
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-provider';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccessDeclinedPage() {
    const { logOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logOut();
        router.push('/login');
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 font-headline text-2xl">
                        You have been PUrged!
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                        Your account application has been declined by an administrator, or your email has been blacklisted.
                    </p>
                    <p>
                        If you believe this is an error, please contact the placement unit.
                    </p>
                    <Button onClick={handleLogout} variant="secondary">
                        Return to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
