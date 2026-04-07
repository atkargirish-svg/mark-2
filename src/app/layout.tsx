import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { AppProvider } from '@/lib/context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'REVO Console - Next-Gen Control',
  description: 'Professional Robotic Arm Control System by REVO Smart Systems',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900 selection:bg-sky-500/20`}>
        <FirebaseClientProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
