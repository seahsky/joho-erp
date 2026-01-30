/**
 * Invoice PDF Download Route
 *
 * GET /api/invoices/[orderId]/pdf
 *
 * Fetches the invoice PDF from Xero and streams it to the client.
 * This endpoint serves as a proxy to Xero's API, using the correct
 * Accept: application/pdf header to get the actual PDF binary.
 *
 * Security:
 * - Requires authenticated user via Clerk
 * - Requires admin, manager, or sales role
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@joho-erp/database';
import { getInvoicePdfBuffer } from '@joho-erp/api/services/xero';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Verify user is authenticated
    const authData = await auth();
    if (!authData.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify user has an authorized role
    const client = await clerkClient();
    const user = await client.users.getUser(authData.userId);
    const metadata = user.publicMetadata as { role?: string };
    const userRole = metadata?.role;

    if (!userRole || !['admin', 'manager', 'sales'].includes(userRole)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Get order's Xero invoice ID
    const { orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { xero: true, orderNumber: true },
    });

    if (!order) {
      return new Response('Order not found', { status: 404 });
    }

    const xeroInfo = order.xero as { invoiceId?: string; invoiceNumber?: string } | null;
    if (!xeroInfo?.invoiceId) {
      return new Response('No invoice exists for this order', { status: 404 });
    }

    // Fetch PDF from Xero
    const pdfBuffer = await getInvoicePdfBuffer(xeroInfo.invoiceId);

    // Determine filename for download
    const filename = xeroInfo.invoiceNumber || `Invoice-${order.orderNumber}`;

    // Convert Buffer to Uint8Array for Web API Response compatibility
    const pdfData = new Uint8Array(pdfBuffer);

    // Return PDF with proper headers
    return new Response(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': pdfData.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch invoice PDF:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Xero integration is disabled')) {
        return new Response('Xero integration is disabled', { status: 503 });
      }
      if (error.message.includes('not connected')) {
        return new Response('Xero is not connected', { status: 503 });
      }
    }

    return new Response('Failed to fetch invoice', { status: 500 });
  }
}
