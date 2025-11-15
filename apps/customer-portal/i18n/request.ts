import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
export const locales = ['en', 'zh-TW', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  console.log('[getRequestConfig] Received locale:', locale);
  console.log('[getRequestConfig] Type:', typeof locale);
  console.log('[getRequestConfig] Valid locales:', locales);

  // If locale is undefined, use 'en' as fallback
  const resolvedLocale = locale || 'en';
  console.log('[getRequestConfig] Resolved locale:', resolvedLocale);

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(resolvedLocale as Locale)) {
    console.error('[getRequestConfig] INVALID LOCALE - calling notFound()');
    notFound();
  }

  console.log('[getRequestConfig] Locale is valid, loading messages...');

  return {
    locale: resolvedLocale as string,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
