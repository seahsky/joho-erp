# Order Workflow Logic Flaws - Analysis Summary

## Date: January 19, 2026

## Issues Identified: 21

### P0 Critical (3)
1. Admin bypass flags accessible to non-admin roles (`order.ts:520-827`)
2. Batch consumption not fully transactional (`packing.ts:847-871`)
3. Flawed idempotency check in markOrderReady (`packing.ts:996-1028`)

### P1 Race Conditions (4)
4. No atomic stock lock during order creation (`order.ts:281-432`)
5. Credit limit check not atomic (`order.ts:320-328`)
6. Concurrent quantity changes in packing (`packing.ts:445-573`)
7. Stock changes between approval and packing (`order.ts:1796-1841`)

### P2 Logic Flaws (11)
8. No status transition validation (`order.ts:1001-1424`)
9. Pending backorders excluded from credit (`order.ts:121-124`)
10. Subproduct loss % changes after order (`order.ts:58-89`)
11. Loss % change during cancellation (`order.ts:1113-1216`)
12. No credit re-validation on partial approval (`order.ts:1843-1876`)
13. Deleted products skipped silently (`packing.ts:781-785`)
14. No pricing re-validation on qty adjustment (`packing.ts:550-569`)
15. No role-based status transition control (`order.ts:1002`)
16. Order total changes not audited (`packing.ts:550-569`)
17. Cart not persisted - in-memory only (`cart.ts:74`)
18. Missing out_for_delivery handler (`order.ts:1006-1013`)

### P3 Edge Cases (3)
19. No delivery date validation in markOrderReady (`packing.ts:730`)
20. Zero-price items bypass minimum order (`order.ts:284-314`)
21. Address could change during packing (`packing.ts:277`)

## Key Files
- `packages/api/src/routers/order.ts` - 10 issues
- `packages/api/src/routers/packing.ts` - 8 issues
- `packages/api/src/routers/cart.ts` - 1 issue
- `packages/database/prisma/schema.prisma` - schema changes needed

## Full Plan Location
`/Users/kyseah/.claude/plans/whimsical-squishing-planet.md`
