import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/request';
import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';

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
    console.log('not found local nalang', locale)
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminLayoutWrapper locale={locale}>
        {children}
      </AdminLayoutWrapper>
    </NextIntlClientProvider>
  );
}
