import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/request';
import { NextResponse, type NextRequest } from 'next/server';

// E2E testing bypass: requires both flags to prevent accidental use in production
const isE2ETesting = process.env.E2E_TESTING === 'true' && process.env.NODE_ENV !== 'production';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Define public routes that don't require authentication
// Include both localized and non-localized paths to handle Clerk's default redirects
const isPublicRoute = createRouteMatcher([
  '/', // Root path - redirects to default locale
  '/en', // Localized home pages
  '/zh-TW',
  '/zh-CN',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/cron/(.*)', // Cron endpoints use CRON_SECRET for auth
]);

// Define patterns that should bypass i18n processing
// These are internal Clerk routes, API routes, and other non-localized paths
const isBypassRoute = (pathname: string) => {
  return (
    pathname.startsWith('/clerk_') ||
    pathname.startsWith('/__clerk') ||
    pathname.includes('/.clerk') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/trpc/')
  );
};

// E2E middleware: applies i18n routing but skips Clerk auth entirely
function e2eMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isBypassRoute(pathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

const defaultMiddleware = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Handle routes that should bypass i18n middleware
  if (isBypassRoute(pathname)) {
    // Still apply auth protection if needed
    if (!isPublicRoute(req)) {
      await auth.protect();
    }

    return NextResponse.next();
  }

  // Apply internationalization middleware FIRST to handle locale routing
  // This ensures locale is properly extracted before auth checks
  const intlResponse = intlMiddleware(req);

  // Then check auth protection
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return intlResponse;
});

export default isE2ETesting ? e2eMiddleware : defaultMiddleware;

export const config = {
  // Match all pathnames except for
  // - … if they have a file extension
  // - … if they are in the _next directory
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
