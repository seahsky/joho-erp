import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';
import { currentUser } from '@clerk/nextjs/server';
import type { SerializableUser } from '@/types/user';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Fetch current user data from Clerk
  const clerkUser = await currentUser();

  // Serialize Clerk User to plain object for Client Components
  // This prevents "Only plain objects can be passed to Client Components" error
  const user: SerializableUser = clerkUser
    ? {
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        emailAddress:
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          null,
      }
    : null;

  return (
    <AdminLayoutWrapper locale={locale} user={user}>
      {children}
    </AdminLayoutWrapper>
  );
}
