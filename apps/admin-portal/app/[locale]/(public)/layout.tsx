import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // If user is authenticated, redirect to dashboard
  const user = await currentUser();
  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
