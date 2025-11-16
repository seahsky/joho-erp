import { redirect } from 'next/navigation';
import { locales } from '@/i18n/request';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  // next-intl middleware with localePrefix: 'always' will handle the redirect
  // but we keep this as a fallback
  redirect(`/${locales[0]}`);
}
