/**
 * Shared Xero types for use across backend and frontend
 * These types are used for customer-facing invoice viewing and API responses
 */

/**
 * Extended invoice data for customers
 * Includes all fields from Xero invoice plus additional data like totals and payment status
 */
export interface CustomerInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  date: string; // ISO date string (YYYY-MM-DD)
  dueDate: string; // ISO date string (YYYY-MM-DD)
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'CREDITED' | 'VOIDED';
  
  // Amounts (in dollars as decimal for display)
  subtotal: number;
  totalTax: number; // GST amount
  total: number;
  amountPaid?: number;
  amountDue?: number;
  
  // Line items
  lineItems: CustomerInvoiceLineItem[];
  
  // Credit note info if applicable
  creditNote?: {
    creditNoteId: string;
    creditNoteNumber: string;
  } | null;
  
  // Metadata
  isLive?: boolean; // Whether this is live data from Xero (true) or cached (false)
  syncedAt?: string; // ISO timestamp of when invoice was last synced
}

/**
 * Invoice line item for customer display
 */
export interface CustomerInvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number; // In dollars
  lineAmount: number; // quantity * unitAmount
  taxAmount?: number;
  taxType?: string;
  itemCode?: string; // SKU reference
}

/**
 * Invoice list item (summary)
 */
export interface CustomerInvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'CREDITED' | 'VOIDED';
  total: number;
  amountDue?: number;
  orderId?: string; // Link back to order
}

/**
 * Status badge mapping for UI display
 */
export const INVOICE_STATUS_MAP = {
  DRAFT: 'draft',
  SUBMITTED: 'pending',
  AUTHORISED: 'approved',
  PAID: 'paid',
  CREDITED: 'credited',
  VOIDED: 'cancelled',
} as const;

export type InvoiceStatusDisplay = typeof INVOICE_STATUS_MAP[keyof typeof INVOICE_STATUS_MAP];
