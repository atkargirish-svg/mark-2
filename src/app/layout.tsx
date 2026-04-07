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
      <body className={`${inter.variable} font-sans antialiased text-white selection:bg-yellow-500/20 relative min-h-screen bg-[#0a0f14]`}>
        {/* Background Video Container - Deepest Layer */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-60"
          >
            <source src="/veo/veo.mp4" type="video/mp4" />
          </video>
          {/* Subtle Gradient Overlays for UI Depth */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
        </div>

        {/* Content Layer - Top Layer */}
        <div className="relative z-10 min-h-screen">
          <FirebaseClientProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </FirebaseClientProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
