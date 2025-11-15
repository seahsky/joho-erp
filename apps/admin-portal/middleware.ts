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
  console.log('[Middleware] URL:', req.url);
  console.log('[Middleware] Pathname:', req.nextUrl.pathname);
  console.log('[Middleware] Is public route:', isPublicRoute(req));

  // Protect all routes except public ones (sign-in, sign-up)
  if (!isPublicRoute(req)) {
    console.log('[Middleware] Protecting route');
    await auth.protect();
  }

  // Apply internationalization middleware to handle locale routing
  const response = intlMiddleware(req);
  console.log('[Middleware] Response status:', response?.status);
  return response;
});

export const config = {
  // Match all pathnames except for
  // - … if they have a file extension
  // - … if they are in the _next directory
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
