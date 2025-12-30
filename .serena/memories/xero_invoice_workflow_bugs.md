# Xero Invoice Workflow Bugs Summary

## Date Reviewed: December 30, 2025

## Critical Issues Identified

### HIGH PRIORITY
1. **Race Condition in Token Refresh** (`xero.ts:269-304`)
   - Concurrent jobs can invalidate each other's tokens
   - Fix: Add mutex pattern using promise singleton

### MEDIUM PRIORITY
2. **No Automatic Retry** (`xero-queue.ts:59-134`) - `maxAttempts` field never used
3. **Fire-and-Forget Errors** - Only logged to console, not surfaced to UI
4. **No Rate Limiting** - Can hit Xero's 60 calls/minute limit
5. **Error Details Lost** - Xero error messages not included in exceptions
6. **No Transaction Wrapping** - Partial failures possible

### LOW PRIORITY
7. Retry counter resets to 0 on manual retry
8. `isConnected()` only checks token existence
9. Customer sync error messages lack context

## Key Files
- `packages/api/src/services/xero.ts`
- `packages/api/src/services/xero-queue.ts`
- `packages/api/src/routers/delivery.ts`

## Documentation
Full implementation plan saved to: `docs/xero-invoice-bugs.md`
