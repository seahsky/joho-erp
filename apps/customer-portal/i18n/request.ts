import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'zh-TW', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a Promise in next-intl v4
  const requested = await requestLocale;

  // Validate and fall back to default if invalid
  const locale =
    requested && locales.includes(requested as Locale) ? requested : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
