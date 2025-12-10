# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the RBAC security implementation for the Joho Foods ERP system. RBAC ensures that users can only access endpoints and data appropriate for their role.

## Role Hierarchy

The system supports six distinct roles:

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrators | **Full access** to all endpoints and features |
| `sales` | Sales team members | Customer management, orders, pricing, deliveries |
| `manager` | Department managers | Similar to sales with additional analytics |
| `packer` | Warehouse staff | Packing interface and stock management |
| `driver` | Delivery drivers | Delivery management and updates |
| `customer` | End customers | Own profile and orders only (default) |

## Security Model

### Authentication Requirements
- **All** API endpoints require authentication via Clerk
- Unauthenticated requests are rejected with `UNAUTHORIZED` error
- Public endpoints (e.g., registration) use `publicProcedure`

### Role Assignment
- Roles are stored in Clerk's `publicMetadata` under the `role` key
- Users without an assigned role default to `customer`
- Only Clerk administrators can assign non-customer roles

### Authorization Flow
1. User makes API request with authentication token
2. tRPC context fetches user's role from Clerk metadata
3. Endpoint middleware checks if user's role is in allowed roles list
4. `admin` role always bypasses role checks (superuser)
5. Request proceeds if authorized, otherwise returns `FORBIDDEN` error

### Error Handling
- Generic error messages prevent role enumeration attacks
- All authorization failures return: "Insufficient permissions to access this resource"
- No information is leaked about which roles are valid

## Endpoint Protection

### Admin-Only Endpoints

These endpoints require the `admin` role:

**Customer Management:**
- `customer.createCustomer` - Create new customers (admin only)
- `customer.approveCredit` - Approve credit applications
- `customer.rejectCredit` - Reject credit applications

**Product Management:**
- `product.create` - Create new products
- `product.update` - Update product information

### Admin or Sales Endpoints

These endpoints require `admin` OR `sales` role:

**Dashboard:**
- `dashboard.getStats` - System statistics
- `dashboard.getRecentOrders` - Recent order list
- `dashboard.getLowStockItems` - Low stock alerts

**Customer Management:**
- `customer.getAll` - List all customers
- `customer.getById` - View customer details

**Pricing:**
- `pricing.getCustomerPrices` - Customer-specific pricing
- `pricing.setCustomerPrice` - Update custom pricing
- `pricing.bulkImport` - Bulk pricing import

**Deliveries:**
- `delivery.getAll` - List deliveries
- `delivery.assignDriver` - Assign delivery drivers
- `delivery.markDelivered` - Mark deliveries complete

### Packer Endpoints

These endpoints require `packer` OR `admin` role:

**Packing Operations:**
- `packing.getSession` - Get packing session
- `packing.getOrderDetails` - Order packing details
- `packing.markItemPacked` - Mark items as packed
- `packing.markOrderReady` - Mark order ready for delivery
- `packing.addPackingNotes` - Add notes to packing orders

### Protected Endpoints (Any Authenticated User)

These endpoints require authentication but no specific role:

**Orders:**
- `order.create` - Create order (customers can create their own)
- `order.getById` - View order details (customers: own orders only; admin/sales/manager: all orders)
- `order.getMyOrders` - List customer's own orders
- `order.reorder` - Reorder from existing order (customers: own orders only)

**Customer Profile:**
- `customer.getProfile` - View own profile
- `customer.updateProfile` - Update own profile

**Pricing:**
- `pricing.getCustomerProductPrice` - Get effective price for order creation

**Cart:**
- `cart.addItem` - Add items to cart
- `cart.removeItem` - Remove items from cart
- `cart.updateQuantity` - Update item quantities
- `cart.getCart` - View current cart
- `cart.clearCart` - Clear all items from cart

**Products:**
- `product.getAll` - List all products
- `product.getById` - View product details

## Setting Up User Roles in Clerk

### Via Clerk Dashboard

1. Log in to your Clerk Dashboard
2. Navigate to **Users** section
3. Select the user you want to assign a role to
4. Click **Public metadata** tab
5. Add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Replace `"admin"` with the desired role: `sales`, `manager`, `packer`, `driver`, or `customer`
7. Click **Save**

### Via Clerk Backend API

You can also set roles programmatically using Clerk's backend API:

```typescript
import { clerkClient } from '@clerk/nextjs/server';

async function assignUserRole(userId: string, role: 'admin' | 'sales' | 'manager' | 'packer' | 'driver' | 'customer') {
  const client = await clerkClient();

  await client.users.updateUser(userId, {
    publicMetadata: {
      role: role
    }
  });
}
```

### Default Role Behavior

- If `publicMetadata.role` is not set, the user defaults to `customer`
- This ensures all users can access customer-facing endpoints
- Admin must explicitly assign elevated roles

## Testing Role-Based Access

### Test Plan

1. **Admin Role Test**
   - Create user with `role: "admin"` in Clerk
   - Verify access to all endpoints including `customer.createCustomer`
   - Confirm no FORBIDDEN errors on any protected endpoint

2. **Sales Role Test**
   - Create user with `role: "sales"` in Clerk
   - Verify access to `dashboard.*`, `pricing.*`, `delivery.*`
   - Confirm FORBIDDEN on `customer.createCustomer` (admin-only)

3. **Customer Role Test**
   - Create user with no role (defaults to customer)
   - Verify access to `customer.getProfile`, `order.create`
   - Confirm FORBIDDEN on `dashboard.getStats`, `pricing.setCustomerPrice`

4. **Packer Role Test**
   - Create user with `role: "packer"` in Clerk
   - Verify access to `packing.*` endpoints
   - Confirm FORBIDDEN on admin/sales endpoints

### Manual Testing

Use the browser console or API client:

```javascript
// This should work for admin/sales users
await trpc.dashboard.getStats.query();

// This should work for all authenticated users
await trpc.customer.getProfile.query();

// This should only work for admin users
await trpc.customer.createCustomer.mutate({...});
```

## Implementation Details

### Context Enhancement

The tRPC context includes:
```typescript
{
  userId: string | null;      // Clerk user ID
  sessionId: string | null;   // Clerk session ID
  userRole: UserRole;         // User's role from Clerk metadata
}
```

### Middleware Stack

```
Request
  ↓
Auth Middleware (protectedProcedure)
  ↓ (ensures userId exists)
Role Middleware (hasRole(['admin', 'sales']))
  ↓ (checks userRole in allowed roles)
Endpoint Handler
  ↓
Response
```

### Type Safety

All roles are type-checked using the `UserRole` type:

```typescript
export type UserRole = 'admin' | 'sales' | 'manager' | 'packer' | 'driver' | 'customer';
```

This prevents typos and ensures only valid roles are used.

## Security Best Practices

### Do's ✅
- Always use role middleware for sensitive endpoints
- Keep role assignments in Clerk metadata
- Use generic error messages for authorization failures
- Default to least privilege (customer role)
- Regularly audit role assignments

### Don'ts ❌
- Don't hardcode roles in client-side code
- Don't trust role information from client
- Don't leak role information in error messages
- Don't create endpoints without proper role checks
- Don't bypass role checks for "convenience"

## Troubleshooting

### User Can't Access Endpoint

1. Check user's role in Clerk Dashboard → Users → (user) → Public metadata
2. Verify role is spelled correctly (case-sensitive)
3. Confirm endpoint requires that role (check router file)
4. Check browser console for error details

### Role Not Being Applied

1. Clear browser cache and cookies
2. Log out and log back in to refresh session
3. Verify Clerk metadata was saved successfully
4. Check server logs for Clerk API errors

### Admin Can't Access Endpoint

1. Admin role should bypass all checks - this indicates a bug
2. Verify the endpoint uses the correct middleware
3. Check that `hasRole` middleware allows admin bypass
4. Review server logs for role check failures

## Implementation Notes

### Recent Updates

**Data Isolation Enhancement (2025-11-19)**
- Enhanced `order.getById` endpoint with role-based data isolation
- Customers can now only view their own orders
- Admin/Sales/Manager roles can view all orders
- Generic error messages prevent information leakage

**Middleware Standardization (2025-11-19)**
- All packer endpoints now use the standardized `isPacker` middleware from `trpc.ts`
- Removed local middleware definitions for consistency
- All role middlewares are now exported from the central `trpc.ts` file

### Current Endpoint Coverage

**Total Endpoints**: 43
**Protected**: 100%
**With Role-Based Access Control**: 100%

All endpoints are properly protected with either:
- Role-based middleware (admin, sales, packer, etc.)
- Protected procedure with data isolation (customer endpoints)

### Known Limitations

**Unimplemented Documented Features:**
- `product.updateStock` - Stock management for sales/packer roles (not yet implemented)
- `order.cancel` - Order cancellation feature (not yet implemented)

**Driver Role:**
- The `driver` role is defined in the system but not currently used by any endpoints
- Reserved for future mobile app delivery features
- The `isDriver` middleware exists but has no active endpoints

**Manager vs Sales Roles:**
- Manager role currently has the same permissions as sales role
- Both roles use `isAdminOrSalesOrManager` middleware
- No manager-specific endpoints currently exist
- Consider consolidating or defining distinct manager responsibilities

### Middleware Reference

All role middlewares are defined in `/packages/api/src/trpc.ts`:

```typescript
isAdmin              // Admin only
isAdminOrSales      // Admin or Sales
isAdminOrSalesOrManager  // Admin, Sales, or Manager
isPacker            // Packer or Admin (used by all packing endpoints)
isDriver            // Driver or Admin (reserved for future use)
```

## Future Enhancements

Potential improvements to the RBAC system:

1. **Permission Groups**: More granular permissions beyond roles
2. **Role Inheritance**: Hierarchical role structure
3. **Audit Logging**: Track all authorization decisions
4. **Dynamic Roles**: Load roles from database instead of Clerk
5. **Multi-Tenancy**: Organization-level role assignments
6. **Stock Management**: Implement `product.updateStock` endpoint
7. **Order Cancellation**: Implement `order.cancel` endpoint
8. **Driver Features**: Add delivery tracking endpoints for driver role

## References

- [Clerk User Metadata Documentation](https://clerk.com/docs/users/metadata)
- [tRPC Middleware Documentation](https://trpc.io/docs/server/middlewares)
- [OWASP Authorization Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
