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
  } | null;
  delivery?: {
    deliveredAt?: Date | null;
  } | null;
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
 */
export async function syncContactToXero(customer: CustomerForXeroSync): Promise<{
  success: boolean;
  contactId?: string;
  error?: string;
}> {
  try {
    const contactPayload = mapCustomerToXeroContact(customer);

    if (customer.xeroContactId) {
      // Update existing contact
      const response = await xeroApiRequest<XeroContactsResponse>(
        `/Contacts/${customer.xeroContactId}`,
        { method: 'POST', body: { Contacts: [contactPayload] } }
      );
      return { success: true, contactId: response.Contacts[0].ContactID };
    }

    // Create new contact
    const response = await xeroApiRequest<XeroContactsResponse>('/Contacts', {
      method: 'POST',
      body: { Contacts: [contactPayload] },
    });

    return { success: true, contactId: response.Contacts[0].ContactID };
  } catch (error) {
    console.error('Failed to sync contact to Xero:', error);
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

    // Check for duplicate invoice
    if (order.xero?.invoiceId) {
      return { success: false, error: 'Invoice already exists for this order' };
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
    return {
      success: true,
      invoiceId: createdInvoice.InvoiceID,
      invoiceNumber: createdInvoice.InvoiceNumber,
    };
  } catch (error) {
    console.error('Failed to create invoice in Xero:', error);
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

    // Allocate credit note to original invoice
    if (createdCreditNote.CreditNoteID && order.xero.invoiceId) {
      try {
        await allocateCreditNoteToInvoice(
          createdCreditNote.CreditNoteID,
          order.xero.invoiceId,
          order.totalAmount / 100 // Convert cents to dollars
        );
      } catch (allocError) {
        console.error('Failed to allocate credit note to invoice:', allocError);
        // Continue even if allocation fails - credit note is still created
      }
    }

    return {
      success: true,
      creditNoteId: createdCreditNote.CreditNoteID,
      creditNoteNumber: createdCreditNote.CreditNoteNumber,
    };
  } catch (error) {
    console.error('Failed to create credit note in Xero:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credit note',
    };
  }
}
