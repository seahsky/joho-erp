import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { TRPCProvider } from './trpc-provider';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

const outfit = localFont({
  src: '../public/fonts/Outfit-Variable.woff2',
  variable: '--font-outfit',
  weight: '100 900',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={outfit.variable}>
        <body className="font-outfit antialiased">
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
