
'use client';

import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '../theme-toggle';
import { useAuth } from '@/lib/auth-provider';
import { useRouter, usePathname } from 'next/navigation';

function TieIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s-4-4-4-9V3h8v10s-4 4-4 9z"/>
      <path d="M10.5 7.5a1.5 1.5 0 0 1 3 0"/>
    </svg>
  );
}

const ADMIN_EMAIL = 'f20240819@hyderabad.bits-pilani.ac.in';

export function Header() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAdminPage = pathname === '/admin';
  
  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-8 z-30">
      <div className="flex items-center gap-8 max-w-7xl mx-auto w-full">
        <Link href="/dashboard" className="flex items-center gap-3">
          <TieIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-headline text-card-foreground hidden sm:block">PUrge BPHC</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">

          {user && (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${user.id}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className='hidden sm:flex flex-col text-left'>
                <span className="text-sm font-medium text-card-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
            </div>
          )}

          {isAdmin && (
             <Button variant="ghost" size="icon" asChild>
               <Link href={isAdminPage ? "/dashboard" : "/admin"}>
                <Shield className="h-5 w-5" />
                <span className="sr-only">Admin</span>
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
