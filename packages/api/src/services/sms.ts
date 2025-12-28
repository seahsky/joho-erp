/**
 * SMS Service using Twilio
 *
 * This service handles all SMS sending functionality using the Twilio API.
 * Environment variables required:
 * - TWILIO_ACCOUNT_SID: Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Twilio Auth Token
 * - TWILIO_PHONE_NUMBER: Twilio sender phone number (e.g., +61400000000)
 */

import twilio from 'twilio';
import { DEFAULT_SMS_TEMPLATE } from '@joho-erp/shared';

// Initialize Twilio client (lazy initialization)
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  return twilioClient;
}

// Phone number from environment
const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER;

/**
 * Check if SMS service is configured
 */
export function isSmsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Send an SMS message
 */
export async function sendSms(params: {
  to: string;
  message: string;
}): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    const client = getTwilioClient();

    if (!client || !FROM_PHONE) {
      console.warn('Twilio not configured, skipping SMS send');
      return { success: false, message: 'SMS service not configured' };
    }

    // Normalize phone number (ensure it starts with +)
    let toNumber = params.to.trim();
    if (!toNumber.startsWith('+')) {
      // Assume Australian number if not prefixed
      if (toNumber.startsWith('0')) {
        toNumber = '+61' + toNumber.slice(1);
      } else {
        toNumber = '+' + toNumber;
      }
    }

    const result = await client.messages.create({
      from: FROM_PHONE,
      to: toNumber,
      body: params.message,
    });

    console.log(`[SMS] Sent to ${toNumber}, SID: ${result.sid}`);
    return {
      success: true,
      message: `SMS sent successfully to ${toNumber}`,
      sid: result.sid,
    };
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
}

/**
 * Send a test SMS
 */
export async function sendTestSms(
  to: string
): Promise<{ success: boolean; message: string }> {
  return sendSms({
    to,
    message:
      'This is a test SMS from Joho Foods ERP. If you received this, the SMS service is working correctly!',
  });
}

/**
 * Send an order reminder SMS to a customer
 */
export async function sendOrderReminderSms(params: {
  customerName: string;
  phone: string;
  messageTemplate?: string;
  companyName?: string;
}): Promise<{ success: boolean; message: string }> {
  const {
    customerName,
    phone,
    messageTemplate = DEFAULT_SMS_TEMPLATE,
    companyName = 'Joho Foods',
  } = params;

  // Replace placeholders in template
  const message = messageTemplate
    .replace(/{customerName}/g, customerName)
    .replace(/{companyName}/g, companyName);

  return sendSms({
    to: phone,
    message,
  });
}

/**
 * Batch send order reminder SMS to multiple customers
 */
export async function sendBulkOrderReminderSms(params: {
  customers: Array<{
    name: string;
    phone: string;
  }>;
  messageTemplate?: string;
  companyName?: string;
}): Promise<{
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ name: string; phone: string; error: string }>;
}> {
  const { customers, messageTemplate, companyName } = params;

  const errors: Array<{ name: string; phone: string; error: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const customer of customers) {
    const result = await sendOrderReminderSms({
      customerName: customer.name,
      phone: customer.phone,
      messageTemplate,
      companyName,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push({
        name: customer.name,
        phone: customer.phone,
        error: result.message,
      });
    }

    // Small delay between sends to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    success: failed === 0,
    total: customers.length,
    sent,
    failed,
    errors,
  };
}
