import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/request';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Define public routes that don't require authentication
// Include both localized and non-localized paths to handle Clerk's default redirects
const isPublicRoute = createRouteMatcher([
  '/', // Root path - redirects to default locale
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Apply internationalization middleware first to ensure locale handling
  const intlResponse = intlMiddleware(req);

  // Protect all routes except public ones (sign-in, sign-up)
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return intlResponse;
});

export const config = {
  // Match all pathnames except for
  // - … if they have a file extension
  // - … if they are in the _next directory
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
