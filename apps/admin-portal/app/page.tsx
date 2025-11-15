import { redirect } from 'next/navigation';
import { locales } from '@/i18n/request';

export default function RootPage() {
  // next-intl middleware with localePrefix: 'always' will handle the redirect
  // but we keep this as a fallback
  redirect(`/${locales[0]}`);
}
