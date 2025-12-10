/**
 * Xero OAuth Callback Route
 *
 * GET /api/xero/auth-callback
 *
 * Handles the OAuth 2.0 callback from Xero after user authorization.
 * Exchanges the authorization code for access/refresh tokens and stores them.
 *
 * Query Parameters:
 * - code: Authorization code from Xero
 * - state: CSRF state token for validation
 * - error: Error code if authorization was denied
 * - error_description: Human-readable error description
 *
 * Security:
 * - Validates CSRF state token against cookie
 * - Requires authenticated session
 * - Clears state cookie after use
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForTokens,
  getConnectedTenants,
  storeTokens,
} from '@joho-erp/api/services/xero';

// State cookie name (must match connect route)
const STATE_COOKIE_NAME = 'xero_oauth_state';

// Base URL for redirects
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

// Settings page URL
const getSettingsUrl = (params?: Record<string, string>) => {
  const url = new URL('/en/settings/integrations', getBaseUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Check for OAuth errors from Xero
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Xero OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      getSettingsUrl({
        xero: 'error',
        message: errorDescription || error,
      })
    );
  }

  // Get authorization code and state
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(
      getSettingsUrl({
        xero: 'error',
        message: 'No authorization code received',
      })
    );
  }

  if (!state) {
    return NextResponse.redirect(
      getSettingsUrl({
        xero: 'error',
        message: 'No state parameter received',
      })
    );
  }

  try {
    // Verify user is authenticated
    const authData = await auth();

    if (!authData.userId) {
      return NextResponse.redirect(
        getSettingsUrl({
          xero: 'error',
          message: 'Authentication required',
        })
      );
    }

    // Validate CSRF state token
    const cookieStore = await cookies();
    const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value;

    if (!storedState || storedState !== state) {
      console.error('CSRF state mismatch:', { storedState, receivedState: state });
      return NextResponse.redirect(
        getSettingsUrl({
          xero: 'error',
          message: 'Invalid state parameter. Please try again.',
        })
      );
    }

    // Clear the state cookie
    cookieStore.delete(STATE_COOKIE_NAME);

    // Exchange authorization code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);

    // Get connected tenants to find the tenant ID
    console.log('Fetching connected tenants...');
    const tenants = await getConnectedTenants(tokens.access_token);

    if (tenants.length === 0) {
      return NextResponse.redirect(
        getSettingsUrl({
          xero: 'error',
          message: 'No Xero organizations found. Please ensure you have access to at least one organization.',
        })
      );
    }

    // Use the first tenant (or implement tenant selection UI later)
    const selectedTenant = tenants[0];
    console.log('Selected tenant:', selectedTenant.tenantName);

    // Store the tokens in the database
    await storeTokens(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      selectedTenant.tenantId
    );

    console.log('Xero OAuth completed successfully');

    // Redirect to settings page with success
    return NextResponse.redirect(
      getSettingsUrl({
        xero: 'success',
        tenant: selectedTenant.tenantName,
      })
    );
  } catch (error) {
    console.error('Error in Xero OAuth callback:', error);

    return NextResponse.redirect(
      getSettingsUrl({
        xero: 'error',
        message: error instanceof Error ? error.message : 'Failed to complete OAuth',
      })
    );
  }
}
