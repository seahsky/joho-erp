import { authMiddleware } from '@clerk/nextjs';
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/request';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default authMiddleware({
  beforeAuth: (req) => {
    // Step 1: Use the incoming request for i18n
    return intlMiddleware(req);
  },
  // Routes that can be accessed without authentication
  publicRoutes: ['/:locale', '/:locale/sign-in', '/:locale/sign-up'],
});

export const config = {
  // Match all pathnames except for
  // - … if they have a file extension
  // - … if they are in the _next directory
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
