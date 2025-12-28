# SMS Order Reminders

This document describes the SMS order reminder feature that allows administrators to send automated weekly SMS reminders to customers prompting them to place orders.

## Overview

The SMS order reminder system uses Twilio to send scheduled text messages to customers. Each customer can opt-in to receive reminders on a specific day of the week, and administrators can configure the global message template and send time.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Portal                              │
├─────────────────────────────────────────────────────────────────┤
│  Settings > SMS           │  Customers > [id]                   │
│  ├─ Global enable/disable │  ├─ SMS Reminder checkbox           │
│  ├─ Message template      │  └─ Day of week selector            │
│  ├─ Send time (HH:mm)     │                                     │
│  └─ Test SMS              │                                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  SMS Router               │  Customer Router                    │
│  ├─ getSettings           │  └─ update (includes SMS prefs)     │
│  ├─ updateSettings        │                                     │
│  └─ sendTestSms           │                                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SMS Service                                │
│  packages/api/src/services/sms.ts                               │
│  ├─ sendSms(to, message)                                        │
│  ├─ sendTestSms(to)                                             │
│  ├─ sendOrderReminderSms(customerName, phone, template)         │
│  └─ isSmsConfigured()                                           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Twilio API                                   │
│  Sends SMS via configured phone number                          │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Twilio SMS Service
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+61400000000
```

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (must be verified) |

### In-App Cron Configuration (Agenda)

The application uses [Agenda](https://github.com/agenda/agenda), a MongoDB-backed job scheduler, to automatically trigger cron jobs. This runs within the Node.js process and requires no external cron configuration.

**How it works:**
1. When the server starts, `instrumentation.ts` initializes the Agenda scheduler
2. Agenda connects to MongoDB and schedules jobs defined in `lib/cron/agenda.ts`
3. Jobs are executed by calling internal `/api/cron/*` endpoints
4. Job state is persisted in MongoDB collection `agendaJobs`

**Scheduled Jobs:**
| Job | Schedule | Description |
|-----|----------|-------------|
| `sms-reminder` | `0 * * * *` (hourly) | Send SMS order reminders |
| `low-stock` | `0 * * * *` (hourly) | Check inventory and send alerts |
| `packing-timeout` | `*/5 * * * *` (every 5 min) | Process stale packing sessions |

**Environment Variables:**
```bash
# Required for cron to run
MONGODB_URI=mongodb://...           # Already configured for Prisma
CRON_SECRET=your-secure-secret      # Authorization for cron endpoints

# Optional
DISABLE_INTERNAL_CRON=false         # Set to 'true' to disable all cron jobs
ENABLE_CRON_IN_DEV=false            # Set to 'true' to enable cron in development
```

**Benefits of Agenda:**
- **Persistence**: Jobs survive server restarts
- **Locking**: Only one instance executes each job (safe for multi-instance deployments)
- **Retry**: Built-in failure handling
- **Visibility**: Jobs visible in MongoDB `agendaJobs` collection

## Database Schema

### Company Settings

```prisma
type SmsSettings {
  enabled           Boolean   @default(false)
  messageTemplate   String?   // SMS template with placeholders
  sendTime          String?   // HH:mm format, e.g. "09:00" (AEST)
}
```

### Customer Preferences

```prisma
type SmsReminderPreferences {
  enabled             Boolean   @default(false)
  reminderDay         String?   // "monday", "tuesday", etc.
  lastReminderSentAt  DateTime? // Tracks last send to prevent duplicate SMS
}
```

## Admin Portal Usage

### Global SMS Settings

Navigate to **Settings > SMS Reminders** to configure:

1. **Enable SMS Reminders** - Master switch to enable/disable all SMS reminders
2. **Message Template** - Customize the SMS content (max 160 characters)
   - Available placeholders: `{customerName}`, `{companyName}`
   - Default: "Hi {customerName}, reminder from {companyName} to place your order for this week."
3. **Send Time** - Time of day to send reminders (AEST timezone)
4. **Test SMS** - Send a test message to verify configuration

### Per-Customer Settings

Navigate to **Customers > [Customer] > Edit** to configure:

1. **Enable SMS Reminders** - Toggle for this specific customer
   - Requires customer to have a mobile number
2. **Reminder Day** - Select which day of the week to send the reminder

## API Endpoints

### SMS Router (`/api/trpc/sms.*`)

| Endpoint | Permission | Description |
|----------|------------|-------------|
| `sms.getSettings` | `settings.sms:view` | Get global SMS settings |
| `sms.updateSettings` | `settings.sms:edit` | Update global SMS settings |
| `sms.sendTestSms` | `settings.sms:edit` | Send a test SMS |
| `sms.checkConfiguration` | `settings.sms:view` | Check if Twilio is configured |

### Customer Router

The `customer.update` mutation accepts `smsReminderPreferences`:

```typescript
{
  smsReminderPreferences: {
    enabled: boolean,
    reminderDay: 'monday' | 'tuesday' | ... | 'sunday' | null
  }
}
```

## Cron Job

**Endpoint:** `/api/cron/sms-reminder`

**Schedule:** Hourly (triggered by Agenda scheduler)

**Logic:**
1. Verify `CRON_SECRET` authorization
2. Check if Twilio is configured via environment variables
3. Check if SMS is globally enabled in company settings
4. Compare current hour (AEST) with configured send time
5. Get current day of week (AEST)
6. Query active customers where:
   - `smsReminderPreferences.enabled = true`
   - `smsReminderPreferences.reminderDay = currentDay`
   - `contactPerson.mobile` is not empty
7. For each customer:
   - Skip if `lastReminderSentAt` is already today (idempotency check)
   - Send SMS using the message template
   - Update `lastReminderSentAt` timestamp on success
8. Log results to `SystemLog`

**Response Example:**
```json
{
  "success": true,
  "message": "SMS reminders sent: 5 success, 0 failed, 2 skipped",
  "day": "monday",
  "totalCustomers": 7,
  "sentCount": 5,
  "failedCount": 0,
  "skippedCount": 2
}
```

## Permissions

| Permission | Description |
|------------|-------------|
| `settings.sms:view` | View SMS settings |
| `settings.sms:edit` | Edit SMS settings and send test messages |

These permissions are automatically assigned to the `admin` role.

## File Locations

| File | Description |
|------|-------------|
| `packages/database/prisma/schema.prisma` | Database schema with SmsSettings and SmsReminderPreferences |
| `packages/api/src/services/sms.ts` | Twilio SMS service |
| `packages/api/src/routers/sms.ts` | SMS settings API router |
| `packages/api/src/routers/customer.ts` | Customer router (includes SMS preferences) |
| `packages/shared/src/constants/index.ts` | DAYS_OF_WEEK, DEFAULT_SMS_TEMPLATE constants |
| `packages/shared/src/constants/permissions.ts` | SMS permission definitions |
| `apps/admin-portal/app/[locale]/(app)/settings/sms/page.tsx` | SMS settings UI |
| `apps/admin-portal/app/[locale]/(app)/customers/[id]/page.tsx` | Customer detail with SMS preferences |
| `apps/admin-portal/app/api/cron/sms-reminder/route.ts` | Cron endpoint for sending reminders |
| `apps/admin-portal/lib/cron/agenda.ts` | Agenda scheduler configuration |
| `apps/admin-portal/instrumentation.ts` | Next.js startup hook for Agenda |
| `apps/admin-portal/messages/*.json` | i18n translations |

## Internationalization

Translations are available in:
- English (`en.json`)
- Simplified Chinese (`zh-CN.json`)
- Traditional Chinese (`zh-TW.json`)

Key namespaces:
- `settings.categories.sms` - Settings hub card
- `settings.sms.*` - SMS settings page
- `customerDetail.smsReminder.*` - Customer detail SMS section
- `days.*` - Day names

## Troubleshooting

### SMS Not Being Sent

1. **Check Twilio Configuration**
   - Verify environment variables are set correctly
   - Test with the "Send Test SMS" feature in settings

2. **Check Global Enable**
   - Ensure SMS is enabled in Settings > SMS Reminders

3. **Check Customer Settings**
   - Verify customer has SMS enabled
   - Verify customer has a valid mobile number
   - Verify reminder day is set

4. **Check Agenda Scheduler**
   - Review `SystemLog` for `sms-reminder-cron` entries
   - Check server logs for `[Agenda]` messages
   - Verify `MONGODB_URI` and `CRON_SECRET` are set
   - Check MongoDB `agendaJobs` collection for job status
   - Ensure `DISABLE_INTERNAL_CRON` is not set to `true`

5. **Check Timing**
   - Verify current time matches configured send time (AEST)
   - Jobs run hourly at minute 0

### Common Errors

| Error | Solution |
|-------|----------|
| "SMS service not configured" | Set Twilio environment variables |
| "SMS reminders globally disabled" | Enable in Settings > SMS Reminders |
| Phone number format errors | Ensure numbers include country code (+61 for Australia) |
| Agenda not starting | Check `MONGODB_URI` is set and MongoDB is accessible |
| Jobs not running | Check `DISABLE_INTERNAL_CRON` env var, verify server logs |

## Security Considerations

- Twilio credentials are stored only in environment variables (not in database)
- Cron endpoint is protected by `CRON_SECRET`
- SMS settings require `settings.sms:edit` permission
- Customer SMS preferences are audited via the change tracking system
