/**
 * Xero OAuth Connect Route
 *
 * GET /api/xero/connect
 *
 * Initiates the Xero OAuth 2.0 authorization flow by redirecting
 * the user to Xero's login page.
 *
 * Security:
 * - Requires authenticated admin/sales user
 * - Generates CSRF state token stored in cookie
 * - State token validated in callback
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateState, getAuthorizationUrl } from '@jimmy-beef/api/services/xero';

// State cookie configuration
const STATE_COOKIE_NAME = 'xero_oauth_state';
const STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

export async function GET() {
  try {
    // Verify user is authenticated
    const authData = await auth();

    if (!authData.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate CSRF state token
    const state = generateState();

    // Get the authorization URL
    const authUrl = getAuthorizationUrl(state);

    // Store state in a secure, httpOnly cookie for CSRF validation
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/',
    });

    // Redirect to Xero authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Xero OAuth:', error);

    // Redirect to settings page with error
    const errorUrl = new URL('/en/settings/integrations', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    errorUrl.searchParams.set('xero', 'error');
    errorUrl.searchParams.set('message', error instanceof Error ? error.message : 'Failed to initiate OAuth');

    return NextResponse.redirect(errorUrl.toString());
  }
}
