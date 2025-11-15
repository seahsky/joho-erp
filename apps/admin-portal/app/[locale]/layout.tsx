import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/request';
import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';
import { currentUser } from '@clerk/nextjs/server';

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
  console.log('[LocaleLayout] Starting with locale:', locale);
  console.log('[LocaleLayout] Valid locales:', locales);
  console.log('[LocaleLayout] Is valid:', locales.includes(locale as (typeof locales)[number]));

  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as (typeof locales)[number])) {
    console.log('[LocaleLayout] NOT FOUND - Invalid locale:', locale);
    notFound();
  }

  console.log('[LocaleLayout] Locale is valid, proceeding...');

  // Fetch current user data from Clerk
  const user = await currentUser();

  // Providing all messages to the client side is the easiest way to get started
  let messages;
  try {
    console.log('[LocaleLayout] Calling getMessages() with locale:', locale);
    messages = await getMessages({ locale });
    console.log('[LocaleLayout] getMessages() succeeded, message keys:', Object.keys(messages).slice(0, 5));
  } catch (error) {
    console.error('[LocaleLayout] ERROR in getMessages():', error);
    throw error;
  }

  console.log('[LocaleLayout] Rendering children...');

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminLayoutWrapper locale={locale} user={user}>
        {children}
      </AdminLayoutWrapper>
    </NextIntlClientProvider>
  );
}
