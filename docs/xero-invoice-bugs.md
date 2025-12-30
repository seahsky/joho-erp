# Xero Invoice Creation Workflow - Bug Review

> **Status:** Implementation deferred. Review this document before implementing fixes.
> **Last Reviewed:** December 30, 2025

## Summary
Reviewed the Xero invoice creation workflow for bugs and reliability issues. Found **9 issues** ranging from high to low severity.

---

## Critical Files Analyzed
- `packages/api/src/services/xero.ts` - Core Xero API service
- `packages/api/src/services/xero-queue.ts` - Job queue processing
- `packages/api/src/routers/delivery.ts` - Invoice creation triggers

---

## Issues Found

### 1. Race Condition in Token Refresh (HIGH)
**File:** `packages/api/src/services/xero.ts:269-304`

**Problem:** `getValidAccessToken()` has no locking/synchronization. When multiple concurrent invoice jobs run:
- Job A sees expired token, starts refresh
- Job B also sees expired token, starts refresh
- Both use same refresh token
- Xero invalidates refresh tokens after use
- One job fails with "invalid refresh token"

**Fix:** Add mutex/lock around token refresh logic.

---

### 2. No Automatic Retry on Transient Failures (MEDIUM)
**File:** `packages/api/src/services/xero-queue.ts:59-134`

**Problem:** The `maxAttempts` field (default 3) is never used. Failures immediately mark job as "failed" with no automatic retry:
- Network timeouts become permanent failures
- Rate limits (429) become permanent failures
- Temporary Xero outages require manual intervention

**Fix:** Implement exponential backoff retry logic before marking as failed.

---

### 3. Fire-and-Forget Pattern Loses Errors (MEDIUM)
**File:** `packages/api/src/services/xero-queue.ts:45-47` and `delivery.ts:195-197`

**Problem:** Job processing errors are only logged to console:
```typescript
processJob(job).catch((error) => {
  console.error(`Failed to process Xero job ${job.id}:`, error);
});
```
Users don't know invoice failed until they check admin panel.

**Fix:** Add failure notification (email/webhook) or surface errors in UI.

---

### 4. No Rate Limiting Protection (MEDIUM)
**File:** `packages/api/src/services/xero.ts:581-608`

**Problem:** Xero API has 60 calls/minute limit. Bulk deliveries can overwhelm:
- All invoice creations fire immediately
- 429 errors return generic message without backoff
- No queuing/throttling mechanism

**Fix:** Add rate limiting with queue or delay mechanism.

---

### 5. Error Details Lost in API Request (MEDIUM)
**File:** `packages/api/src/services/xero.ts:600-604`

**Problem:**
```typescript
const errorText = await response.text();
console.error(`[Xero] API ERROR:`, errorText);
throw new Error(`Xero API request failed: ${response.status}`);
```
The detailed `errorText` (validation errors, etc.) is logged but NOT thrown. Makes debugging difficult.

**Fix:** Include `errorText` in the thrown error.

---

### 6. No Transaction Wrapping (MEDIUM)
**File:** `packages/api/src/services/xero-queue.ts:293-320`

**Problem:** In `processCreateInvoice()`:
1. Invoice created in Xero (external call)
2. Order updated in database

If step 2 fails after step 1 succeeds:
- Invoice exists in Xero
- Not recorded locally
- Duplicate invoice on retry (though duplicate detection helps)

**Fix:** Move external calls inside try-catch, or implement compensation pattern.

---

### 7. Retry Resets Attempt Counter (LOW)
**File:** `packages/api/src/services/xero-queue.ts:496-498`

**Problem:**
```typescript
data: {
  status: 'pending',
  attempts: 0,  // Resets to 0 on every retry
  ...
}
```
Allows unlimited manual retries. May or may not be intentional.

**Fix:** Decide on policy - limit total attempts or allow unlimited manual retries.

---

### 8. isConnected() Only Checks Refresh Token Existence (LOW)
**File:** `packages/api/src/services/xero.ts:541-544`

**Problem:**
```typescript
export async function isConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return !!(tokens?.refreshToken);
}
```
Doesn't verify if refresh token is valid. Job fails only when attempting to use it.

**Fix:** Optional - could add validation call, but adds latency.

---

### 9. Missing Error Handling in Customer Auto-Sync (LOW)
**File:** `packages/api/src/services/xero-queue.ts:221-233`

**Problem:** When customer sync fails during invoice creation, error message could be clearer:
```typescript
if (!customerSync.success) {
  return { success: false, error: `Customer sync failed: ${customerSync.error}` };
}
```
The nested error doesn't include context about which customer or what specifically failed.

**Fix:** Improve error messages with customer ID and business name.

---

## Recommendations by Priority

### High Priority (Fix First)
1. **Race Condition in Token Refresh** - Can cause invoice creation failures under load

### Medium Priority (Should Fix)
2. **No Automatic Retry** - Implement exponential backoff using `maxAttempts`
3. **Rate Limiting** - Add delay between Xero API calls
4. **Error Details Lost** - Include Xero error messages in exceptions
5. **Failure Notifications** - Alert when jobs fail

### Low Priority (Nice to Have)
6. **Transaction wrapping** - Add compensation for partial failures
7. **isConnected validation** - Optional validation of refresh token
8. **Improve error messages** - Add context to failure messages

---

## Implementation Plan

### Phase 1: Fix Critical Race Condition (Issue #1)
**File:** `packages/api/src/services/xero.ts`

```typescript
// Add at top of file
let tokenRefreshPromise: Promise<{ accessToken: string; tenantId: string }> | null = null;

// Modify getValidAccessToken()
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

  // Use mutex pattern - if refresh already in progress, await it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  // Start refresh and store promise
  tokenRefreshPromise = (async () => {
    try {
      console.log('Xero access token expired, refreshing...');
      const newTokens = await refreshAccessToken(tokens.refreshToken!);

      await storeTokens(
        newTokens.access_token,
        newTokens.refresh_token,
        newTokens.expires_in,
        tokens.tenantId!
      );

      return {
        accessToken: newTokens.access_token,
        tenantId: tokens.tenantId!,
      };
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}
```

---

### Phase 2: Add Automatic Retry with Backoff (Issue #2)
**File:** `packages/api/src/services/xero-queue.ts`

Modify `processJob()` to implement retry logic:

```typescript
async function processJob(job: XeroSyncJob): Promise<void> {
  // Check if Xero is connected
  const connected = await isConnected();
  if (!connected) {
    await markJobFailed(job, 'Xero is not connected', false); // Don't retry
    return;
  }

  // Mark as processing
  await prisma.xeroSyncJob.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      lastAttemptAt: new Date(),
      attempts: job.attempts + 1,
    },
  });

  try {
    let result: { success: boolean; error?: string; [key: string]: unknown };

    switch (job.type) {
      case 'sync_contact':
        result = await processSyncContact(job.entityId);
        break;
      case 'create_invoice':
        result = await processCreateInvoice(job.entityId, job.id);
        break;
      case 'create_credit_note':
        result = await processCreateCreditNote(job.entityId, job.id);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    if (result.success) {
      await prisma.xeroSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: JSON.parse(JSON.stringify(result)),
          completedAt: new Date(),
          error: null,
        },
      });
    } else {
      await handleJobFailure(job, result.error || 'Unknown error');
    }
  } catch (error) {
    await handleJobFailure(job, error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleJobFailure(job: XeroSyncJob, error: string): Promise<void> {
  const attempts = job.attempts + 1;
  const shouldRetry = attempts < job.maxAttempts && isRetryableError(error);

  if (shouldRetry) {
    // Exponential backoff: 1min, 4min, 16min
    const delayMs = Math.pow(4, attempts) * 60 * 1000;
    const nextAttemptAt = new Date(Date.now() + delayMs);

    await prisma.xeroSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'pending',
        error: `Attempt ${attempts} failed: ${error}. Retrying at ${nextAttemptAt.toISOString()}`,
        nextAttemptAt,
      },
    });

    // Schedule retry
    setTimeout(() => {
      processJob({ ...job, attempts }).catch(console.error);
    }, delayMs);
  } else {
    await prisma.xeroSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        error: `Failed after ${attempts} attempts: ${error}`,
      },
    });
  }
}

function isRetryableError(error: string): boolean {
  const retryableCodes = ['429', '500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT'];
  return retryableCodes.some(code => error.includes(code));
}
```

---

### Phase 3: Improve Error Details (Issues #3, #5, #9)
**File:** `packages/api/src/services/xero.ts`

```typescript
// Create custom error class
export class XeroApiError extends Error {
  constructor(
    public statusCode: number,
    public endpoint: string,
    public details: string
  ) {
    super(`Xero API error (${statusCode}) at ${endpoint}: ${details}`);
    this.name = 'XeroApiError';
  }
}

// Update xeroApiRequest()
export async function xeroApiRequest<T>(
  endpoint: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
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
    throw new XeroApiError(response.status, endpoint, errorText);
  }

  return response.json();
}
```

**File:** `packages/api/src/services/xero-queue.ts`

Improve customer sync error messages:
```typescript
// In processCreateInvoice()
if (!order.customer.xeroContactId) {
  const customerSync = await processSyncContact(order.customer.id);
  if (!customerSync.success) {
    return {
      success: false,
      error: `Failed to sync customer "${order.customer.businessName}" (ID: ${order.customer.id}) to Xero: ${customerSync.error}`
    };
  }
  // ... rest of code
}
```

---

### Phase 4: Add Rate Limiting (Issue #4)
**File:** `packages/api/src/services/xero.ts`

```typescript
// Add rate limiter at top of file
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between calls = max 60/minute
let lastApiCall = 0;

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastCall));
  }

  lastApiCall = Date.now();
  return fetch(url, options);
}

// Update xeroApiRequest to use rateLimitedFetch
export async function xeroApiRequest<T>(...) {
  // ... setup code ...
  const response = await rateLimitedFetch(`${XERO_API_BASE}${endpoint}`, {
    // ... options ...
  });
  // ... error handling ...
}
```

---

### Phase 5: Add Transaction Handling (Issue #6)
**File:** `packages/api/src/services/xero-queue.ts`

Wrap database updates with error handling:
```typescript
async function processCreateInvoice(orderId: string, jobId: string): Promise<...> {
  // ... existing code up to createInvoiceInXero ...

  const result = await createInvoiceInXero(orderForSync, customerForSync);

  try {
    if (result.success) {
      const currentXero = (order.xero as Record<string, unknown>) || {};
      await prisma.order.update({
        where: { id: orderId },
        data: {
          xero: {
            ...currentXero,
            invoiceId: result.invoiceId,
            invoiceNumber: result.invoiceNumber,
            invoiceStatus: 'AUTHORISED',
            syncedAt: new Date(),
            syncError: null,
            lastSyncJobId: jobId,
          },
        },
      });
    } else {
      // ... error handling ...
    }
  } catch (dbError) {
    // Invoice was created in Xero but local update failed
    // Log critical error with invoice details for manual recovery
    console.error(
      `[CRITICAL] Invoice created in Xero (${result.invoiceId}) but failed to update order ${orderId}:`,
      dbError
    );
    // Return success but with warning - invoice exists
    return {
      success: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      warning: 'Invoice created but local record update failed',
    };
  }

  return result;
}
```

---

### Phase 6: Fix Retry Counter (Issue #7)
**File:** `packages/api/src/services/xero-queue.ts`

```typescript
export async function retryJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const job = await prisma.xeroSyncJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'failed') {
    return { success: false, error: 'Only failed jobs can be retried' };
  }

  // Keep track of total retries but reset automatic retry counter
  const updatedJob = await prisma.xeroSyncJob.update({
    where: { id: jobId },
    data: {
      status: 'pending',
      attempts: 0, // Reset automatic retry counter
      nextAttemptAt: new Date(),
      error: `Manual retry requested. Previous error: ${job.error}`,
    },
  });

  processJob(updatedJob).catch((error) => {
    console.error(`Failed to process Xero job ${jobId}:`, error);
  });

  return { success: true };
}
```

---

### Phase 7: Improve Connection Check (Issue #8)
**File:** `packages/api/src/services/xero.ts`

```typescript
export async function isConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  if (!tokens?.refreshToken) return false;

  // Check if token can potentially be refreshed (not expired > 60 days)
  // Xero refresh tokens are valid for 60 days
  if (tokens.tokenExpiry) {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    if (tokens.tokenExpiry < sixtyDaysAgo) {
      return false; // Token too old to refresh
    }
  }

  return true;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/api/src/services/xero.ts` | Token mutex, XeroApiError class, rate limiting, improved isConnected |
| `packages/api/src/services/xero-queue.ts` | Retry logic, error handling, transaction safety, retry counter fix |

---

## Testing Plan

1. **Race condition**: Simulate concurrent token refreshes
2. **Retry logic**: Test with mock 429/500 errors
3. **Rate limiting**: Batch 100+ invoice creations, verify no 429s
4. **Error messages**: Verify Xero error details appear in UI
5. **Transaction safety**: Simulate DB failure after Xero success
