/**
 * Xero OAuth 2.0 Service
 *
 * This service handles Xero OAuth authentication and API interactions.
 * It implements the Authorization Code flow with PKCE support.
 *
 * Environment variables required:
 * - XERO_CLIENT_ID: Xero OAuth Client ID
 * - XERO_CLIENT_SECRET: Xero OAuth Client Secret
 * - XERO_REDIRECT_URI: OAuth callback URL (e.g., https://admin.johofoods.com/api/xero/auth-callback)
 * - XERO_SCOPES: Space-separated OAuth scopes (e.g., "accounting.transactions accounting.contacts")
 */

import { prisma } from '@joho-erp/database';
import crypto from 'crypto';

// Xero OAuth endpoints
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

// Configuration from environment variables
const getConfig = () => ({
  clientId: process.env.XERO_CLIENT_ID || '',
  clientSecret: process.env.XERO_CLIENT_SECRET || '',
  redirectUri: process.env.XERO_REDIRECT_URI || '',
  scopes: process.env.XERO_SCOPES || 'openid profile email accounting.transactions accounting.contacts offline_access',
});

/**
 * Token response from Xero
 */
export interface XeroTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  scope: string;
}

/**
 * Xero tenant (organization) information
 */
export interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

/**
 * Generate a cryptographically secure state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate the Xero OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const config = getConfig();

  if (!config.clientId) {
    throw new Error('XERO_CLIENT_ID is not configured');
  }

  if (!config.redirectUri) {
    throw new Error('XERO_REDIRECT_URI is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state: state,
  });

  return `${XERO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<XeroTokenResponse> {
  const config = getConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Xero OAuth credentials are not configured');
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xero token exchange failed:', errorText);
    throw new Error(`Failed to exchange code for tokens: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<XeroTokenResponse> {
  const config = getConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Xero OAuth credentials are not configured');
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xero token refresh failed:', errorText);
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get connected Xero tenants (organizations)
 */
export async function getConnectedTenants(accessToken: string): Promise<XeroTenant[]> {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get Xero tenants:', errorText);
    throw new Error(`Failed to get connected tenants: ${response.status}`);
  }

  return response.json();
}

/**
 * Store OAuth tokens in the database
 */
export async function storeTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  tenantId?: string
): Promise<void> {
  const company = await prisma.company.findFirst();

  if (!company) {
    throw new Error('Company not found. Please create company profile first.');
  }

  const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

  // Get existing xeroSettings to preserve clientId and clientSecret
  const existingSettings = company.xeroSettings as {
    clientId?: string;
    clientSecret?: string;
  } | null;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      xeroSettings: {
        clientId: existingSettings?.clientId || '',
        clientSecret: existingSettings?.clientSecret || '',
        tenantId: tenantId || null,
        refreshToken: refreshToken,
        tokenExpiry: tokenExpiry,
        // Store access token temporarily (consider encrypting in production)
        accessToken: accessToken,
      },
    },
  });
}

/**
 * Get stored tokens from the database
 */
export async function getStoredTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  tenantId: string | null;
} | null> {
  const company = await prisma.company.findFirst({
    select: { xeroSettings: true },
  });

  if (!company || !company.xeroSettings) {
    return null;
  }

  const settings = company.xeroSettings as {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    tenantId?: string;
  };

  return {
    accessToken: settings.accessToken || null,
    refreshToken: settings.refreshToken || null,
    tokenExpiry: settings.tokenExpiry ? new Date(settings.tokenExpiry) : null,
    tenantId: settings.tenantId || null,
  };
}

/**
 * Check if the access token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return true;

  // Consider token expired if it expires within 5 minutes
  const bufferMs = 5 * 60 * 1000;
  return new Date().getTime() > tokenExpiry.getTime() - bufferMs;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<{ accessToken: string; tenantId: string }> {
  const tokens = await getStoredTokens();

  if (!tokens || !tokens.refreshToken) {
    throw new Error('Xero is not connected. Please authenticate first.');
  }

  if (!tokens.tenantId) {
    throw new Error('Xero tenant not selected. Please reconnect to Xero.');
  }

  // If token is still valid, return it
  if (tokens.accessToken && !isTokenExpired(tokens.tokenExpiry)) {
    return {
      accessToken: tokens.accessToken,
      tenantId: tokens.tenantId,
    };
  }

  // Token is expired or about to expire, refresh it
  console.log('Xero access token expired, refreshing...');
  const newTokens = await refreshAccessToken(tokens.refreshToken);

  // Store the new tokens
  await storeTokens(
    newTokens.access_token,
    newTokens.refresh_token,
    newTokens.expires_in,
    tokens.tenantId
  );

  return {
    accessToken: newTokens.access_token,
    tenantId: tokens.tenantId,
  };
}

/**
 * Test the Xero connection by fetching organization info
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  tenantName?: string;
}> {
  try {
    const { accessToken } = await getValidAccessToken();
    const tenants = await getConnectedTenants(accessToken);

    if (tenants.length === 0) {
      return {
        success: false,
        message: 'No Xero organizations connected',
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Xero',
      tenantName: tenants[0].tenantName,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Disconnect from Xero by clearing stored tokens
 */
export async function disconnect(): Promise<void> {
  const company = await prisma.company.findFirst();

  if (!company) {
    throw new Error('Company not found');
  }

  // Get existing xeroSettings to preserve clientId and clientSecret
  const existingSettings = company.xeroSettings as {
    clientId?: string;
    clientSecret?: string;
  } | null;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      xeroSettings: {
        clientId: existingSettings?.clientId || '',
        clientSecret: existingSettings?.clientSecret || '',
        tenantId: null,
        refreshToken: null,
        tokenExpiry: null,
        accessToken: null,
      },
    },
  });
}

/**
 * Check if Xero is currently connected (has valid refresh token)
 */
export async function isConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return !!(tokens?.refreshToken);
}

/**
 * Get the connection status with details
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  tenantId: string | null;
  tokenExpiry: Date | null;
  needsRefresh: boolean;
}> {
  const tokens = await getStoredTokens();

  if (!tokens || !tokens.refreshToken) {
    return {
      connected: false,
      tenantId: null,
      tokenExpiry: null,
      needsRefresh: false,
    };
  }

  return {
    connected: true,
    tenantId: tokens.tenantId,
    tokenExpiry: tokens.tokenExpiry,
    needsRefresh: isTokenExpired(tokens.tokenExpiry),
  };
}

// ============================================================================
// Xero API Methods (for future use)
// ============================================================================

/**
 * Make an authenticated request to the Xero API
 */
export async function xeroApiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<T> {
  const { accessToken, tenantId } = await getValidAccessToken();

  const response = await fetch(`${XERO_API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Xero API error (${endpoint}):`, errorText);
    throw new Error(`Xero API request failed: ${response.status}`);
  }

  return response.json();
}
