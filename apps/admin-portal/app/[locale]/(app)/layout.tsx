import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';
import { currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SerializableUser } from '@/types/user';

// E2E testing bypass: requires both flags to prevent accidental use in production
const isE2ETesting = process.env.E2E_TESTING === 'true' && process.env.NODE_ENV !== 'production';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let user: SerializableUser;

  if (isE2ETesting) {
    // In E2E testing mode, build user from custom headers instead of Clerk
    const headerStore = await headers();
    const userName = headerStore.get('x-e2e-user-name') || 'E2E User';
    const nameParts = userName.split(' ');

    user = {
      firstName: nameParts[0] || 'E2E',
      lastName: nameParts.slice(1).join(' ') || 'User',
      emailAddress: 'e2e@test.com',
    };
  } else {
    // Fetch current user data from Clerk
    const clerkUser = await currentUser();

    // Redirect unauthenticated users to landing page
    if (!clerkUser) {
      redirect(`/${locale}`);
    }

    // Serialize Clerk User to plain object for Client Components
    // This prevents "Only plain objects can be passed to Client Components" error
    user = {
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      emailAddress:
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        null,
    };
  }

  return (
    <AdminLayoutWrapper locale={locale} user={user}>
      {children}
    </AdminLayoutWrapper>
  );
}
