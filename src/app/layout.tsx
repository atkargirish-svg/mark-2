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
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0f14] text-white selection:bg-yellow-500/20`}>
        {/* Background Video Layer */}
        <div className="fixed inset-0 z-[-10] overflow-hidden pointer-events-none">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-40"
          >
            <source src="/bg.mp4" type="video/mp4" />
          </video>
          {/* Subtle tech overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f14]/80 via-transparent to-[#0a0f14]/90" />
        </div>

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
