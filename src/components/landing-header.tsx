'use client';

import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

function TieIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s-4-4-4-9V3h8v10s-4 4-4 9z"/>
      <path d="M10.5 7.5a1.5 1.5 0 0 1 3 0"/>
    </svg>
  );
}

function HamburgerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg width="16" height="16" viewBox="0 0 256 256" className="group-has-[input:checked]:hidden fill-foreground" {...props}>
            <path d="M228 128a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12ZM40 76h176a12 12 0 0 0 0-24H40a12 12 0 0 0 0 24Zm176 104H40a12 12 0 0 0 0 24h176a12 12 0 0 0 0-24Z"/>
        </svg>
    )
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg width="16" height="16" viewBox="0 0 256 256" className="hidden group-has-[input:checked]:block fill-foreground" {...props}>
            <path d="M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128 47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z"/>
        </svg>
    )
}

export function LandingHeader() {
    return (
        <header className="bg-background/80 dark:bg-background/50 backdrop-blur-md sticky top-0 z-50 border-b">
            <nav className="mx-auto max-w-[52.5rem] p-4 lg:max-w-[78rem] lg:p-6">
                <div className="relative flex items-center gap-x-4">
                    <div className="order-1 flex grow basis-0">
                        <Link href="/login" className="order-1 flex items-center gap-2 font-headline text-xl font-bold">
                            <TieIcon className="h-7 w-7 text-primary" />
                            <span>PUrge BPHC</span>
                        </Link>
                    </div>
                    <div className="order-4 flex items-center group peer lg:hidden">
                        <input type="checkbox" id="menu" className="hidden"/>
                        <label htmlFor="menu" className="bg-background hover:bg-muted ring-1 ring-inset ring-border rounded-lg p-2 cursor-pointer">
                           <HamburgerIcon />
                           <CloseIcon />
                        </label>
                    </div>
                    <div className="order-3 absolute top-11 left-0 w-full hidden peer-has-[:checked]:flex flex-col gap-2 bg-background ring-1 ring-inset ring-border shadow-md rounded-lg px-6 py-4 lg:order-2 lg:relative lg:top-0 lg:w-auto lg:flex lg:flex-row lg:ring-0 lg:p-0 lg:shadow-none">
                        <div className="flex flex-col gap-2 lg:flex-row *:flex *:items-center *:gap-x-1.5 *:py-1.5 *:text-sm *:text-foreground *:font-medium lg:*:px-2">
                        </div>
                        <div className="w-full flex py-2 lg:hidden">
                            <Link href="/login" className="w-full rounded-lg px-3 py-1.5 text-sm font-medium text-center bg-background hover:bg-muted ring-1 ring-inset ring-border text-foreground transition duration-[250ms] ease-in-out">
                                Login
                            </Link>
                        </div>
                    </div>
                    <div className="order-2 inline-flex items-center gap-x-3 lg:order-3 *:rounded-lg *:px-3 *:py-1.5 *:text-sm *:font-medium *:transition *:duration-[250ms] *:ease-in-out">
                        <Link href="/login" className="hidden bg-background hover:bg-muted ring-1 ring-inset ring-border text-foreground lg:block">
                            Login
                        </Link>
                        <Link href="/signup" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Sign Up
                        </Link>
                        <ThemeToggle />
                    </div>
                </div>
            </nav>
        </header>
    )
}
