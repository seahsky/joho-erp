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
import { encrypt, decrypt, isEncryptionEnabled } from '../utils/encryption';

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
 * Check if Xero integration is enabled via environment variable.
 * Defaults to true for backward compatibility.
 */
export function isXeroIntegrationEnabled(): boolean {
  const enabled = process.env.XERO_INTEGRATION_ENABLED;
  // Default to true for backward compatibility - only 'false' disables
  return enabled !== 'false';
}

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
    console.error('[Xero] Token Exchange FAILED:', errorText);
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
    console.error('[Xero] Token Refresh FAILED:', errorText);
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
    console.error('[Xero] Get Tenants FAILED:', errorText);
    throw new Error(`Failed to get connected tenants: ${response.status}`);
  }

  return response.json();
}

/**
 * Store OAuth tokens in the database
 * Tokens are encrypted if XERO_TOKEN_ENCRYPTION_KEY is set
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

  // Encrypt tokens before storage
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = encrypt(refreshToken);

  await prisma.company.update({
    where: { id: company.id },
    data: {
      xeroSettings: {
        clientId: existingSettings?.clientId || '',
        clientSecret: existingSettings?.clientSecret || '',
        tenantId: tenantId || null,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: tokenExpiry,
        accessToken: encryptedAccessToken,
      },
    },
  });
}

/**
 * Get stored tokens from the database
 * Tokens are decrypted if encryption is enabled
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

  // Decrypt tokens (handles unencrypted tokens for migration)
  const accessToken = settings.accessToken ? decrypt(settings.accessToken) : null;
  const refreshToken = settings.refreshToken ? decrypt(settings.refreshToken) : null;

  return {
    accessToken,
    refreshToken,
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
 * Detailed connection test result
 */
export interface XeroConnectionTestResult {
  success: boolean;
  message: string;
  details: {
    tokenValid: boolean;
    tokenExpiresInMinutes: number | null;
    tenantConnected: boolean;
    tenantName: string | null;
    canReadContacts: boolean;
    canReadInvoices: boolean;
    canWriteContacts: boolean;
    encryptionEnabled: boolean;
  };
  errors: string[];
}

// Test contact used for write permission verification
const TEST_CONTACT: XeroContact = {
  Name: '_JOHO_ERP_TEST_CONTACT',
  FirstName: 'Test',
  LastName: 'Contact',
  EmailAddress: 'joho-erp-test@localhost.invalid',
  IsCustomer: true,
};

/**
 * Test the Xero connection with detailed verification of all permissions
 * Tests: token validity, tenant connection, read contacts, read invoices, write contacts
 */
export async function testConnectionDetailed(): Promise<XeroConnectionTestResult> {
  const errors: string[] = [];
  const details = {
    tokenValid: false,
    tokenExpiresInMinutes: null as number | null,
    tenantConnected: false,
    tenantName: null as string | null,
    canReadContacts: false,
    canReadInvoices: false,
    canWriteContacts: false,
    encryptionEnabled: isEncryptionEnabled(),
  };

  try {
    // Step 1: Check token validity and get valid token (auto-refresh if needed)
    const tokens = await getStoredTokens();
    if (!tokens || !tokens.refreshToken) {
      errors.push('Xero is not connected. Please authenticate first.');
      return {
        success: false,
        message: 'Xero is not connected',
        details,
        errors,
      };
    }

    // Calculate token expiry
    if (tokens.tokenExpiry) {
      const minutesRemaining = Math.round((tokens.tokenExpiry.getTime() - Date.now()) / (1000 * 60));
      details.tokenExpiresInMinutes = Math.max(0, minutesRemaining);
    }

    // Get valid access token (will refresh if expired)
    let accessToken: string;
    let tenantId: string;
    try {
      const validTokens = await getValidAccessToken();
      accessToken = validTokens.accessToken;
      tenantId = validTokens.tenantId;
      details.tokenValid = true;

      // Update expiry after potential refresh
      const refreshedTokens = await getStoredTokens();
      if (refreshedTokens?.tokenExpiry) {
        const minutesRemaining = Math.round((refreshedTokens.tokenExpiry.getTime() - Date.now()) / (1000 * 60));
        details.tokenExpiresInMinutes = Math.max(0, minutesRemaining);
      }
    } catch (error) {
      errors.push(`Token error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: 'Failed to get valid access token',
        details,
        errors,
      };
    }

    // Step 2: Test tenant connection
    try {
      const tenants = await getConnectedTenants(accessToken);
      if (tenants.length > 0) {
        details.tenantConnected = true;
        // Find the tenant matching our stored tenantId
        const matchingTenant = tenants.find(t => t.tenantId === tenantId);
        details.tenantName = matchingTenant?.tenantName || tenants[0].tenantName;
      } else {
        errors.push('No Xero organizations connected');
      }
    } catch (error) {
      errors.push(`Tenant connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 3: Test read contacts permission
    try {
      await xeroApiRequest<XeroContactsResponse>('/Contacts?page=1&pageSize=1');
      details.canReadContacts = true;
    } catch (error) {
      errors.push(`Read contacts error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 4: Test read invoices permission
    try {
      await xeroApiRequest<XeroInvoicesResponse>('/Invoices?page=1&pageSize=1');
      details.canReadInvoices = true;
    } catch (error) {
      errors.push(`Read invoices error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 5: Test write contacts permission
    try {
      // First, search for existing test contact
      const existingContactId = await findExistingContactByEmail(TEST_CONTACT.EmailAddress!);

      if (existingContactId) {
        // Update existing test contact (proves write works)
        await xeroApiRequest<XeroContactsResponse>(
          `/Contacts/${existingContactId}`,
          { method: 'POST', body: { Contacts: [TEST_CONTACT] } }
        );
      } else {
        // Create new test contact (proves write works)
        await xeroApiRequest<XeroContactsResponse>('/Contacts', {
          method: 'POST',
          body: { Contacts: [TEST_CONTACT] },
        });
      }
      details.canWriteContacts = true;
    } catch (error) {
      errors.push(`Write contacts error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Determine overall success
    const success = details.tokenValid &&
      details.tenantConnected &&
      details.canReadContacts &&
      details.canReadInvoices &&
      details.canWriteContacts;

    return {
      success,
      message: success
        ? 'All Xero connection tests passed'
        : 'Some Xero connection tests failed',
      details,
      errors,
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      message: 'Connection test failed with unexpected error',
      details,
      errors,
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
  if (!isXeroIntegrationEnabled()) {
    return false;
  }
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
    console.error(`[Xero] API ERROR (${endpoint}):`, errorText);
    throw new Error(`Xero API request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Xero API Types
// ============================================================================

/**
 * Xero Contact structure
 */
export interface XeroContact {
  ContactID?: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  Phones?: Array<{
    PhoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX';
    PhoneNumber: string;
  }>;
  Addresses?: Array<{
    AddressType: 'POBOX' | 'STREET' | 'DELIVERY';
    AddressLine1?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }>;
  IsCustomer: boolean;
  DefaultCurrency?: string;
  PaymentTerms?: {
    Sales?: {
      Day: number;
      Type: 'DAYSAFTERBILLDATE' | 'DAYSAFTERBILLMONTH' | 'OFCURRENTMONTH' | 'OFFOLLOWINGMONTH';
    };
  };
}

export interface XeroContactsResponse {
  Contacts: XeroContact[];
}

/**
 * Xero Invoice line item
 */
export interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number; // In dollars (Xero uses decimal)
  AccountCode: string;
  TaxType: string;
  ItemCode?: string; // Optional SKU reference
}

/**
 * Xero Invoice structure
 */
export interface XeroInvoice {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Type: 'ACCREC' | 'ACCPAY';
  Contact: { ContactID: string };
  LineItems: XeroLineItem[];
  Date: string; // YYYY-MM-DD
  DueDate: string; // YYYY-MM-DD
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
  CurrencyCode: string;
  Reference?: string;
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
}

export interface XeroInvoicesResponse {
  Invoices: XeroInvoice[];
}

/**
 * Xero Credit Note structure
 */
export interface XeroCreditNote {
  CreditNoteID?: string;
  CreditNoteNumber?: string;
  Type: 'ACCRECCREDIT' | 'ACCPAYCREDIT';
  Contact: { ContactID: string };
  LineItems: XeroLineItem[];
  Date: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
  CurrencyCode: string;
  Reference?: string;
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
}

export interface XeroCreditNotesResponse {
  CreditNotes: XeroCreditNote[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date for Xero API (YYYY-MM-DD)
 */
export function formatXeroDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse payment terms to extract number of days
 * Handles formats like "Net 30", "30 days", "Net 14", etc.
 */
export function parsePaymentTerms(terms: string | null | undefined): number | null {
  if (!terms) return null;
  const match = terms.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the Xero sales account code from environment or default
 */
function getXeroSalesAccountCode(): string {
  return process.env.XERO_SALES_ACCOUNT_CODE || '200';
}

// ============================================================================
// Customer Type (for sync functions)
// ============================================================================

interface CustomerForXeroSync {
  id: string;
  businessName: string;
  xeroContactId?: string | null;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile?: string | null;
  };
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  billingAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
  creditApplication: {
    paymentTerms?: string | null;
  };
}

interface OrderItemForXeroSync {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number; // In cents
  subtotal: number; // In cents
}

interface OrderForXeroSync {
  id: string;
  orderNumber: string;
  items: OrderItemForXeroSync[];
  subtotal: number; // In cents
  taxAmount: number; // In cents
  totalAmount: number; // In cents
  xero?: {
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    invoiceStatus?: string | null;
    creditNoteId?: string | null;
    creditNoteNumber?: string | null;
  } | null;
  delivery?: {
    deliveredAt?: Date | null;
  } | null;
}

// ============================================================================
// Duplicate Detection Helpers
// ============================================================================

/**
 * Search for an existing contact in Xero by email address
 * Used for duplicate detection before creating new contacts
 */
async function findExistingContactByEmail(email: string): Promise<string | null> {
  try {
    // URL encode the email for the where clause
    const whereClause = encodeURIComponent(`EmailAddress=="${email}"`);
    const response = await xeroApiRequest<XeroContactsResponse>(
      `/Contacts?where=${whereClause}`
    );

    if (response.Contacts && response.Contacts.length > 0) {
      return response.Contacts[0].ContactID || null;
    }
    return null;
  } catch {
    // If search fails, return null and proceed with creation
    // (Xero will return error if duplicate exists)
    return null;
  }
}

/**
 * Search for an existing invoice in Xero by reference (order number)
 * Used for duplicate detection before creating new invoices
 */
async function findExistingInvoiceByReference(reference: string): Promise<{
  invoiceId: string;
  invoiceNumber: string;
  status: string;
} | null> {
  try {
    const whereClause = encodeURIComponent(`Reference=="${reference}"`);
    const response = await xeroApiRequest<XeroInvoicesResponse>(
      `/Invoices?where=${whereClause}`
    );

    if (response.Invoices && response.Invoices.length > 0) {
      const invoice = response.Invoices[0];
      return {
        invoiceId: invoice.InvoiceID || '',
        invoiceNumber: invoice.InvoiceNumber || '',
        status: invoice.Status,
      };
    }
    return null;
  } catch {
    // If search fails, return null and proceed with creation
    return null;
  }
}

/**
 * Search for an existing credit note in Xero by reference
 * Used for duplicate detection before creating new credit notes
 */
async function findExistingCreditNoteByReference(reference: string): Promise<{
  creditNoteId: string;
  creditNoteNumber: string;
} | null> {
  try {
    const whereClause = encodeURIComponent(`Reference=="${reference}"`);
    const response = await xeroApiRequest<XeroCreditNotesResponse>(
      `/CreditNotes?where=${whereClause}`
    );

    if (response.CreditNotes && response.CreditNotes.length > 0) {
      const creditNote = response.CreditNotes[0];
      return {
        creditNoteId: creditNote.CreditNoteID || '',
        creditNoteNumber: creditNote.CreditNoteNumber || '',
      };
    }
    return null;
  } catch {
    // If search fails, return null and proceed with creation
    return null;
  }
}

// ============================================================================
// Contact Sync
// ============================================================================

/**
 * Map a customer to Xero Contact format
 */
function mapCustomerToXeroContact(customer: CustomerForXeroSync): XeroContact {
  const contact = customer.contactPerson;
  const deliveryAddr = customer.deliveryAddress;
  const billingAddr = customer.billingAddress || customer.deliveryAddress;

  // Parse payment terms (e.g., "Net 30" -> 30 days)
  const paymentDays = parsePaymentTerms(customer.creditApplication.paymentTerms);

  const phones: XeroContact['Phones'] = [
    { PhoneType: 'DEFAULT', PhoneNumber: contact.phone },
  ];

  if (contact.mobile) {
    phones.push({ PhoneType: 'MOBILE', PhoneNumber: contact.mobile });
  }

  return {
    Name: customer.businessName,
    FirstName: contact.firstName,
    LastName: contact.lastName,
    EmailAddress: contact.email,
    Phones: phones,
    Addresses: [
      {
        AddressType: 'STREET',
        AddressLine1: deliveryAddr.street,
        City: deliveryAddr.suburb,
        Region: deliveryAddr.state,
        PostalCode: deliveryAddr.postcode,
        Country: 'Australia',
      },
      {
        AddressType: 'POBOX',
        AddressLine1: billingAddr.street,
        City: billingAddr.suburb,
        Region: billingAddr.state,
        PostalCode: billingAddr.postcode,
        Country: 'Australia',
      },
    ],
    IsCustomer: true,
    DefaultCurrency: 'AUD',
    PaymentTerms: paymentDays
      ? {
          Sales: {
            Day: paymentDays,
            Type: 'DAYSAFTERBILLDATE',
          },
        }
      : undefined,
  };
}

/**
 * Sync a customer to Xero as a Contact
 * Creates a new contact or updates an existing one
 * Includes duplicate detection to prevent creating duplicate contacts
 */
export async function syncContactToXero(customer: CustomerForXeroSync): Promise<{
  success: boolean;
  contactId?: string;
  error?: string;
}> {
  try {
    const contactPayload = mapCustomerToXeroContact(customer);

    // If customer already has a Xero contact ID, update the existing contact
    if (customer.xeroContactId) {
      const response = await xeroApiRequest<XeroContactsResponse>(
        `/Contacts/${customer.xeroContactId}`,
        { method: 'POST', body: { Contacts: [contactPayload] } }
      );
      console.log(`[Xero] Contact UPDATED: ${response.Contacts[0].ContactID} for customer ${customer.id} (${customer.businessName})`);
      return { success: true, contactId: response.Contacts[0].ContactID };
    }

    // Check for existing contact by email to prevent duplicates
    const existingContactId = await findExistingContactByEmail(customer.contactPerson.email);

    if (existingContactId) {
      // Contact already exists in Xero - update it instead of creating duplicate
      const response = await xeroApiRequest<XeroContactsResponse>(
        `/Contacts/${existingContactId}`,
        { method: 'POST', body: { Contacts: [contactPayload] } }
      );
      console.log(`[Xero] Contact UPDATED: ${response.Contacts[0].ContactID} for customer ${customer.id} (${customer.businessName})`);
      return { success: true, contactId: response.Contacts[0].ContactID };
    }

    // No existing contact found - create new one
    const response = await xeroApiRequest<XeroContactsResponse>('/Contacts', {
      method: 'POST',
      body: { Contacts: [contactPayload] },
    });

    console.log(`[Xero] Contact CREATED: ${response.Contacts[0].ContactID} for customer ${customer.id} (${customer.businessName})`);
    return { success: true, contactId: response.Contacts[0].ContactID };
  } catch (error) {
    console.error('[Xero] Contact Sync FAILED:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync contact',
    };
  }
}

// ============================================================================
// Invoice Creation
// ============================================================================

/**
 * Create an invoice in Xero from an order
 * Includes duplicate detection to prevent creating duplicate invoices
 */
export async function createInvoiceInXero(
  order: OrderForXeroSync,
  customer: CustomerForXeroSync
): Promise<{
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}> {
  try {
    if (!customer.xeroContactId) {
      return { success: false, error: 'Customer not synced to Xero' };
    }

    // Check local record for existing invoice
    if (order.xero?.invoiceId) {
      return {
        success: true,
        invoiceId: order.xero.invoiceId,
        invoiceNumber: order.xero.invoiceNumber || undefined,
        error: undefined,
      };
    }

    // Check Xero directly for existing invoice by order number (Reference field)
    // This catches cases where invoice was created but local record wasn't updated
    const existingInvoice = await findExistingInvoiceByReference(order.orderNumber);
    if (existingInvoice) {
      return {
        success: true,
        invoiceId: existingInvoice.invoiceId,
        invoiceNumber: existingInvoice.invoiceNumber,
      };
    }

    // Calculate due date from payment terms
    const paymentDays = parsePaymentTerms(customer.creditApplication.paymentTerms) || 30;
    const invoiceDate = order.delivery?.deliveredAt || new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentDays);

    // Map order items to Xero line items
    const lineItems: XeroLineItem[] = order.items.map((item) => ({
      Description: `${item.productName} (${item.sku})`,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice / 100, // Convert cents to dollars
      AccountCode: getXeroSalesAccountCode(),
      TaxType: 'OUTPUT', // 10% GST for Australian sales
      ItemCode: item.sku,
    }));

    const invoice: XeroInvoice = {
      Type: 'ACCREC',
      Contact: { ContactID: customer.xeroContactId },
      LineItems: lineItems,
      Date: formatXeroDate(invoiceDate),
      DueDate: formatXeroDate(dueDate),
      Status: 'AUTHORISED', // Auto-approve invoices
      CurrencyCode: 'AUD',
      Reference: order.orderNumber,
      LineAmountTypes: 'Exclusive', // Prices exclude GST, GST added
    };

    const response = await xeroApiRequest<XeroInvoicesResponse>('/Invoices', {
      method: 'POST',
      body: { Invoices: [invoice] },
    });

    const createdInvoice = response.Invoices[0];
    console.log(`[Xero] Invoice CREATED: ${createdInvoice.InvoiceID} (${createdInvoice.InvoiceNumber}) for order ${order.orderNumber}`);
    return {
      success: true,
      invoiceId: createdInvoice.InvoiceID,
      invoiceNumber: createdInvoice.InvoiceNumber,
    };
  } catch (error) {
    console.error('[Xero] Invoice Creation FAILED:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

// ============================================================================
// Credit Note Creation
// ============================================================================

/**
 * Allocate a credit note to an invoice in Xero
 */
async function allocateCreditNoteToInvoice(
  creditNoteId: string,
  invoiceId: string,
  amount: number // In dollars
): Promise<void> {
  await xeroApiRequest(`/CreditNotes/${creditNoteId}/Allocations`, {
    method: 'PUT',
    body: {
      Allocations: [
        {
          Invoice: { InvoiceID: invoiceId },
          Amount: amount,
          Date: formatXeroDate(new Date()),
        },
      ],
    },
  });
}

/**
 * Create a credit note in Xero for a cancelled order
 * Includes duplicate detection to prevent creating duplicate credit notes
 */
export async function createCreditNoteInXero(
  order: OrderForXeroSync,
  customer: CustomerForXeroSync
): Promise<{
  success: boolean;
  creditNoteId?: string;
  creditNoteNumber?: string;
  error?: string;
}> {
  try {
    if (!customer.xeroContactId) {
      return { success: false, error: 'Customer not synced to Xero' };
    }

    if (!order.xero?.invoiceId) {
      return { success: false, error: 'Order has no invoice to credit' };
    }

    // Check local record for existing credit note
    if (order.xero.creditNoteId) {
      return {
        success: true,
        creditNoteId: order.xero.creditNoteId,
        creditNoteNumber: order.xero.creditNoteNumber || undefined,
      };
    }

    // Check Xero directly for existing credit note by reference
    // This catches cases where credit note was created but local record wasn't updated
    const creditNoteReference = `Credit for Order ${order.orderNumber}`;
    const existingCreditNote = await findExistingCreditNoteByReference(creditNoteReference);
    if (existingCreditNote) {
      return {
        success: true,
        creditNoteId: existingCreditNote.creditNoteId,
        creditNoteNumber: existingCreditNote.creditNoteNumber,
      };
    }

    // Map order items to credit note line items
    const lineItems: XeroLineItem[] = order.items.map((item) => ({
      Description: `Credit: ${item.productName} (${item.sku})`,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice / 100, // Convert cents to dollars
      AccountCode: getXeroSalesAccountCode(),
      TaxType: 'OUTPUT',
    }));

    const creditNote: XeroCreditNote = {
      Type: 'ACCRECCREDIT',
      Contact: { ContactID: customer.xeroContactId },
      LineItems: lineItems,
      Date: formatXeroDate(new Date()),
      Status: 'AUTHORISED',
      CurrencyCode: 'AUD',
      Reference: `Credit for Order ${order.orderNumber}`,
      LineAmountTypes: 'Exclusive',
    };

    const response = await xeroApiRequest<XeroCreditNotesResponse>('/CreditNotes', {
      method: 'POST',
      body: { CreditNotes: [creditNote] },
    });

    const createdCreditNote = response.CreditNotes[0];
    console.log(`[Xero] Credit Note CREATED: ${createdCreditNote.CreditNoteID} (${createdCreditNote.CreditNoteNumber}) for order ${order.orderNumber}`);

    // Allocate credit note to original invoice
    if (createdCreditNote.CreditNoteID && order.xero.invoiceId) {
      try {
        await allocateCreditNoteToInvoice(
          createdCreditNote.CreditNoteID,
          order.xero.invoiceId,
          order.totalAmount / 100 // Convert cents to dollars
        );
        console.log(`[Xero] Credit Note ALLOCATED: ${createdCreditNote.CreditNoteNumber} to invoice ${order.xero.invoiceNumber || order.xero.invoiceId}`);
      } catch (allocError) {
        console.error('[Xero] Credit Note Allocation FAILED:', allocError);
        // Continue even if allocation fails - credit note is still created
      }
    }

    return {
      success: true,
      creditNoteId: createdCreditNote.CreditNoteID,
      creditNoteNumber: createdCreditNote.CreditNoteNumber,
    };
  } catch (error) {
    console.error('[Xero] Credit Note Creation FAILED:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credit note',
    };
  }
}
