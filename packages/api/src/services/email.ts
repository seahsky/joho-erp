/**
 * Email Service using Resend
 *
 * This service handles all email sending functionality using the Resend API.
 * Environment variables required:
 * - RESEND_API_KEY: Resend API key
 * - RESEND_FROM_EMAIL: From email address (e.g., noreply@jimmybeef.com.au)
 * - RESEND_ADMIN_EMAIL: Admin email for notifications
 */

import { Resend } from 'resend';
import { formatAUD } from '@jimmy-beef/shared';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration from environment variables
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@jimmybeef.com.au';
const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL || 'admin@jimmybeef.com.au';

/**
 * Send a test email
 */
export async function sendTestEmail(recipient: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: 'Test Email from Jimmy Beef ERP',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from the Jimmy Beef ERP system.</p>
        <p>If you're receiving this, the email service is working correctly!</p>
      `,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: `Test email sent successfully to ${recipient}` };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send backorder submitted notification to customer
 */
export async function sendBackorderSubmittedEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  totalAmount: number;
  stockShortfall: Array<{
    productName: string;
    sku: string;
    requested: number;
    available: number;
    shortfall: number;
    unit: string;
  }>;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, orderNumber, orderDate, totalAmount, stockShortfall } = params;

    const stockShortfallHtml = stockShortfall
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.productName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">${item.sku}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.requested} ${item.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.available} ${item.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #dc2626;">
            ${item.shortfall} ${item.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Backorder Submitted - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backorder Submitted</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #f59e0b;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Backorder Submitted for Review</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${customerName},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    Thank you for your order! We've received your order <strong>#${orderNumber}</strong>, but some items exceed our current stock levels.
                  </p>

                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What happens next?</strong><br/>
                      Your order has been submitted for backorder approval. We'll review the stock availability and get back to you within 1-2 business days with an approval decision.
                    </p>
                  </div>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Date:</td>
                      <td style="padding: 8px 0; text-align: right;">${orderDate.toLocaleDateString('en-AU')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${formatAUD(totalAmount)}</strong></td>
                    </tr>
                  </table>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Stock Availability</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Requested</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Available</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stockShortfallHtml}
                    </tbody>
                  </table>

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    If you have any questions, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send backorder submitted email:', error);
      return { success: false, message: error.message };
    }

    console.log('Backorder submitted email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending backorder submitted email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send backorder approved notification to customer
 */
export async function sendBackorderApprovedEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  approvedItems: Array<{
    productName: string;
    sku: string;
    approvedQuantity: number;
    unit: string;
  }>;
  estimatedFulfillment?: Date;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, orderNumber, totalAmount, approvedItems, estimatedFulfillment, notes } = params;

    const approvedItemsHtml = approvedItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.productName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">${item.sku}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.approvedQuantity} ${item.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const estimatedFulfillmentHtml = estimatedFulfillment
      ? `
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">
            <strong>Estimated Fulfillment Date:</strong><br/>
            ${estimatedFulfillment.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      `
      : '';

    const notesHtml = notes
      ? `
        <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Additional Notes:</strong><br/>
            ${notes}
          </p>
        </div>
      `
      : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Backorder Approved - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backorder Approved</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #10b981;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">✓ Backorder Approved!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${customerName},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    Great news! Your backorder for order <strong>#${orderNumber}</strong> has been approved.
                  </p>

                  <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What happens next?</strong><br/>
                      We'll fulfill your order as soon as stock becomes available. You'll receive a notification when your order is ready for delivery.
                    </p>
                  </div>

                  ${estimatedFulfillmentHtml}

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${formatAUD(totalAmount)}</strong></td>
                    </tr>
                  </table>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Approved Items</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${approvedItemsHtml}
                    </tbody>
                  </table>

                  ${notesHtml}

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    If you have any questions, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send backorder approved email:', error);
      return { success: false, message: error.message };
    }

    console.log('Backorder approved email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending backorder approved email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send backorder rejected notification to customer
 */
export async function sendBackorderRejectedEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  reason: string;
  rejectedItems: Array<{
    productName: string;
    sku: string;
    requestedQuantity: number;
    unit: string;
  }>;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, orderNumber, reason, rejectedItems } = params;

    const rejectedItemsHtml = rejectedItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.productName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">${item.sku}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.requestedQuantity} ${item.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Backorder Update - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backorder Update</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #ef4444;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Backorder Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${customerName},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    Thank you for your order <strong>#${orderNumber}</strong>. After reviewing the stock availability and fulfillment timeline, we're unable to fulfill this backorder at this time.
                  </p>

                  <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>Reason:</strong><br/>
                      ${reason}
                    </p>
                  </div>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                  </table>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Affected Items</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rejectedItemsHtml}
                    </tbody>
                  </table>

                  <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What can you do?</strong><br/>
                      • Contact us to discuss alternative options<br/>
                      • Place a new order with adjusted quantities<br/>
                      • Check back later when stock is replenished
                    </p>
                  </div>

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    We apologize for any inconvenience. If you have any questions or would like to discuss alternatives, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send backorder rejected email:', error);
      return { success: false, message: error.message };
    }

    console.log('Backorder rejected email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending backorder rejected email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send backorder partial approval notification to customer
 */
export async function sendBackorderPartialApprovalEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  approvedItems: Array<{
    productName: string;
    sku: string;
    requestedQuantity: number;
    approvedQuantity: number;
    unit: string;
  }>;
  estimatedFulfillment?: Date;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, orderNumber, totalAmount, approvedItems, estimatedFulfillment, notes } = params;

    const approvedItemsHtml = approvedItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.productName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">${item.sku}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.requestedQuantity} ${item.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #10b981; font-weight: 600;">
            ${item.approvedQuantity} ${item.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const estimatedFulfillmentHtml = estimatedFulfillment
      ? `
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">
            <strong>Estimated Fulfillment Date:</strong><br/>
            ${estimatedFulfillment.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      `
      : '';

    const notesHtml = notes
      ? `
        <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Additional Notes:</strong><br/>
            ${notes}
          </p>
        </div>
      `
      : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Backorder Partially Approved - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backorder Partially Approved</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #f59e0b;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Backorder Partially Approved</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${customerName},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    We've reviewed your backorder for order <strong>#${orderNumber}</strong>. While we can't fulfill the full quantities requested, we've approved partial quantities based on available stock.
                  </p>

                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What happens next?</strong><br/>
                      We'll fulfill the approved quantities as soon as stock becomes available. You'll receive a notification when your order is ready for delivery.
                    </p>
                  </div>

                  ${estimatedFulfillmentHtml}

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${formatAUD(totalAmount)}</strong></td>
                    </tr>
                  </table>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Approved Quantities</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Requested</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${approvedItemsHtml}
                    </tbody>
                  </table>

                  ${notesHtml}

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    If you have any questions about the approved quantities, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send backorder partial approval email:', error);
      return { success: false, message: error.message };
    }

    console.log('Backorder partial approval email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending backorder partial approval email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send backorder notification to admin
 */
export async function sendBackorderAdminNotification(params: {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  stockShortfall: Array<{
    productName: string;
    sku: string;
    requested: number;
    available: number;
    shortfall: number;
    unit: string;
  }>;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { orderNumber, customerName, totalAmount, stockShortfall } = params;

    const stockShortfallHtml = stockShortfall
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.productName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">${item.sku}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.requested} ${item.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.available} ${item.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #dc2626;">
            ${item.shortfall} ${item.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔔 New Backorder Requires Approval - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Backorder - Admin Notification</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #3b82f6;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔔 New Backorder Requires Approval</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    A new backorder has been submitted and requires your approval.
                  </p>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${customerName}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${formatAUD(totalAmount)}</strong></td>
                    </tr>
                  </table>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Stock Shortfall</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Requested</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Available</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stockShortfallHtml}
                    </tbody>
                  </table>

                  <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>Action Required:</strong><br/>
                      Log in to the admin portal to review and approve or reject this backorder.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send admin backorder notification:', error);
      return { success: false, message: error.message };
    }

    console.log('Admin backorder notification sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending admin backorder notification:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send credit approved notification to customer
 */
export async function sendCreditApprovedEmail(params: {
  customerEmail: string;
  customerName: string;
  contactPerson: string;
  creditLimit: number; // in cents
  paymentTerms: string;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, contactPerson, creditLimit, paymentTerms, notes } = params;

    const notesHtml = notes
      ? `
        <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Additional Notes:</strong><br/>
            ${notes}
          </p>
        </div>
      `
      : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: 'Credit Application Approved - Jimmy Beef',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credit Application Approved</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #10b981;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">✓ Credit Application Approved!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${contactPerson},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    Congratulations! We're pleased to inform you that your credit application for <strong>${customerName}</strong> has been approved.
                  </p>

                  <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What happens next?</strong><br/>
                      You can now place orders up to your approved credit limit. Simply log in to your account and start shopping!
                    </p>
                  </div>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Your Credit Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 12px; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
                        <strong>Credit Limit:</strong>
                      </td>
                      <td style="padding: 12px; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        <strong style="color: #10b981; font-size: 18px;">${formatAUD(creditLimit)}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                        <strong>Payment Terms:</strong>
                      </td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        ${paymentTerms}
                      </td>
                    </tr>
                  </table>

                  ${notesHtml}

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    If you have any questions about your credit terms or need assistance, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send credit approved email:', error);
      return { success: false, message: error.message };
    }

    console.log('Credit approved email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending credit approved email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send credit rejected notification to customer
 */
export async function sendCreditRejectedEmail(params: {
  customerEmail: string;
  customerName: string;
  contactPerson: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { customerEmail, customerName, contactPerson, reason } = params;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: 'Credit Application Update - Jimmy Beef',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credit Application Update</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #ef4444;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Credit Application Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${contactPerson},</p>

                  <p style="margin: 0 0 20px 0; font-size: 16px;">
                    Thank you for your credit application for <strong>${customerName}</strong>. After careful review, we're unable to approve credit terms at this time.
                  </p>

                  <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>Reason:</strong><br/>
                      ${reason}
                    </p>
                  </div>

                  <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What can you do?</strong><br/>
                      • Contact our sales team to discuss alternative arrangements<br/>
                      • Reapply with additional documentation<br/>
                      • Place orders with payment on delivery (COD)
                    </p>
                  </div>

                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                    We value your interest in doing business with us. Please don't hesitate to reach out to discuss your options.
                  </p>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Best regards,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send credit rejected email:', error);
      return { success: false, message: error.message };
    }

    console.log('Credit rejected email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending credit rejected email:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Send urgent cancellation notification to driver
 */
export async function sendDriverUrgentCancellationEmail(params: {
  driverEmail: string;
  driverName: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  cancellationReason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const { driverEmail, driverName, orderNumber, customerName, deliveryAddress, cancellationReason } = params;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: driverEmail,
      subject: `🚨 URGENT: DO NOT DELIVER - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>URGENT: Order Cancelled</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #ef4444;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🚨 URGENT: DO NOT DELIVER</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Hi ${driverName},</p>

                  <div style="background-color: #fee2e2; border: 2px solid #ef4444; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; font-size: 20px; font-weight: bold; color: #dc2626;">
                      ⛔ DO NOT DELIVER ORDER #${orderNumber}
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 16px; color: #dc2626;">
                      This order has been cancelled. Please return to warehouse.
                    </p>
                  </div>

                  <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937;">Order Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                      <td style="padding: 8px 0; text-align: right;"><strong>${customerName}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Delivery Address:</td>
                      <td style="padding: 8px 0; text-align: right;">${deliveryAddress}</td>
                    </tr>
                  </table>

                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>Cancellation Reason:</strong><br/>
                      ${cancellationReason}
                    </p>
                  </div>

                  <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">
                      <strong>What to do:</strong><br/>
                      1. Do NOT deliver this order<br/>
                      2. Return the order to the warehouse<br/>
                      3. Contact the warehouse if you have questions
                    </p>
                  </div>

                  <p style="margin: 20px 0 0 0; font-size: 16px;">
                    Thank you,<br/>
                    <strong>Jimmy Beef Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Jimmy Beef. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send driver urgent cancellation email:', error);
      return { success: false, message: error.message };
    }

    console.log('Driver urgent cancellation email sent:', data?.id);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending driver urgent cancellation email:', error);
    return { success: false, message: String(error) };
  }
}
