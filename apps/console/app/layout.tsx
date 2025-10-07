import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TestModeBanner } from './components/TestModeBanner';
import { Navigation } from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'COINSCIOUS Operator Console',
  description: 'Admin console for COINSCIOUS Security Token Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <TestModeBanner />
          <Navigation />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}



