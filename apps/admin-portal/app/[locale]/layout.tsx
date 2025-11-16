import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/request';
import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';
import { currentUser } from '@clerk/nextjs/server';
import type { SerializableUser } from '@/types/user';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Admin Portal - Jimmy Beef ERP',
  description: 'Administrative dashboard for Jimmy Beef operations',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

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

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminLayoutWrapper locale={locale} user={user}>
        {children}
      </AdminLayoutWrapper>
    </NextIntlClientProvider>
  );
}
