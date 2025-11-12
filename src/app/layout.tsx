
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import Link from 'next/link';
import { FirebaseClientProvider } from '@/lib/firebase-client-provider';

export const metadata: Metadata = {
  title: 'PUrge BPHC',
  description: 'Task management for the BITS Pilani, Hyderabad Campus Placement Unit',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="LTkd9pTTDc7c5pkAWEvh_gr_6GpXkfIMEgig7YnmN-4" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <FirebaseClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex-grow">
              {children}
            </div>
            <Toaster />
            <footer className="w-full p-4 text-center text-sm text-muted-foreground">
              <div className="flex justify-center items-center gap-4">
                <span>Made by Kuber and Bhoovan. With AI.</span>
                <span className="mx-2">|</span>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              </div>
            </footer>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
