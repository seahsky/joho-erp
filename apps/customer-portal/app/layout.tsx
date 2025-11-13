import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { TRPCProvider } from './trpc-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html>
        <body className="font-sans antialiased">
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
