# API Endpoint Security Matrix

This document provides a comprehensive overview of all API endpoints and their required roles.

## Legend

- 🔓 **Public**: No authentication required
- 🔐 **Protected**: Authentication required (any role)
- 👤 **Customer**: Customer role or higher
- 📦 **Packer**: Packer or admin role
- 🚚 **Driver**: Driver or admin role
- 💼 **Sales**: Sales, manager, or admin role
- 👑 **Admin**: Admin role only

## Customer Router (`customer.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `register` | 🔓 Public | None | New customer registration |
| `getProfile` | 🔐 Protected | Any authenticated | User's own profile |
| `updateProfile` | 🔐 Protected | Any authenticated | User's own profile |
| `getAll` | 💼 Sales | `admin`, `sales`, `manager` | List all customers |
| `getById` | 💼 Sales | `admin`, `sales`, `manager` | View customer details |
| `createCustomer` | 👑 Admin | `admin` | Admin creates customer |
| `approveCredit` | 👑 Admin | `admin` | Approve credit application |
| `rejectCredit` | 👑 Admin | `admin` | Reject credit application |

## Product Router (`product.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `getAll` | 🔐 Protected | Any authenticated | Product catalog |
| `getById` | 🔐 Protected | Any authenticated | Product details |
| `create` | 👑 Admin | `admin` | Create new product |
| `update` | 👑 Admin | `admin` | Update product |
| `updateStock` | 💼 Sales | `admin`, `sales`, `packer` | Adjust stock levels |

## Order Router (`order.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `create` | 🔐 Protected | Any authenticated | Create order |
| `getById` | 🔐 Protected | Any authenticated | View order (own orders for customers) |
| `getAll` | 💼 Sales | `admin`, `sales`, `manager` | List all orders |
| `updateStatus` | 💼 Sales | `admin`, `sales` | Change order status |
| `cancel` | 🔐 Protected | Any authenticated | Cancel own order (customers) or any order (admin/sales) |

## Dashboard Router (`dashboard.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `getStats` | 💼 Sales | `admin`, `sales`, `manager` | System statistics |
| `getRecentOrders` | 💼 Sales | `admin`, `sales`, `manager` | Recent order list |
| `getLowStockItems` | 💼 Sales | `admin`, `sales`, `manager` | Low stock alerts |

## Delivery Router (`delivery.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `getAll` | 💼 Sales | `admin`, `sales`, `manager` | List deliveries |
| `assignDriver` | 💼 Sales | `admin`, `sales` | Assign driver to delivery |
| `markDelivered` | 💼 Sales | `admin`, `sales`, `driver` | Mark delivery complete |
| `getStats` | 💼 Sales | `admin`, `sales`, `manager` | Delivery statistics |

## Pricing Router (`pricing.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `getCustomerPrices` | 💼 Sales | `admin`, `sales`, `manager` | Customer-specific pricing |
| `getProductPrices` | 💼 Sales | `admin`, `sales`, `manager` | Product pricing by customer |
| `getAll` | 💼 Sales | `admin`, `sales`, `manager` | All custom pricing |
| `getCustomerProductPrice` | 🔐 Protected | Any authenticated | Effective price for order creation |
| `setCustomerPrice` | 💼 Sales | `admin`, `sales` | Set/update custom price |
| `deleteCustomerPrice` | 💼 Sales | `admin`, `sales` | Delete custom price |
| `bulkImport` | 💼 Sales | `admin`, `sales` | Bulk pricing import |
| `getCustomerPricingStats` | 💼 Sales | `admin`, `sales`, `manager` | Pricing statistics |

## Packing Router (`packing.*`)

| Endpoint | Access | Roles | Notes |
|----------|--------|-------|-------|
| `getSession` | 📦 Packer | `admin`, `packer` | Get packing session |
| `getOrderDetails` | 📦 Packer | `admin`, `packer` | Order packing details |
| `markItemPacked` | 📦 Packer | `admin`, `packer` | Mark item as packed |
| `markOrderReady` | 📦 Packer | `admin`, `packer` | Mark order ready for delivery |
| `addPackingNotes` | 📦 Packer | `admin`, `packer` | Add packing notes |

## Security Considerations

### Public Endpoints
- `customer.register`: Allows new customer registration without authentication
- These endpoints still validate input and check for duplicates

### Protected Endpoints
- Require valid Clerk authentication
- Customers can only access their own data
- Admin/Sales can access all data

### Role-Specific Endpoints
- Use allowlist approach (explicit role required)
- Admin role bypasses all role checks
- Generic error messages prevent role enumeration

### Data Isolation

**Customer Role:**
- Can only view/modify own profile
- Can only create orders for own account
- Can only view own orders

**Sales Role:**
- Can view all customers and orders
- Can manage pricing and deliveries
- Cannot approve credit (admin only)

**Admin Role:**
- Full system access
- Can perform all operations
- Manages user roles in Clerk

## Future Endpoint Security

When adding new endpoints, follow these guidelines:

1. **Default to Protected**: All endpoints should require authentication
2. **Use Existing Middleware**: Reuse `isAdmin`, `isAdminOrSales`, etc.
3. **Document Requirements**: Add to this matrix
4. **Test Role Access**: Verify all roles behave correctly
5. **Audit Regularly**: Review endpoint security periodically

## Example Usage in Code

```typescript
// Admin-only endpoint
export const productRouter = router({
  create: isAdmin  // Uses hasRole(['admin'])
    .input(productSchema)
    .mutation(async ({ input }) => {
      // Only admins can reach this code
    }),

  // Sales and admin can access
  getAll: isAdminOrSales  // Uses hasRole(['admin', 'sales'])
    .query(async () => {
      // Sales and admins can reach this code
    }),

  // Any authenticated user
  getById: protectedProcedure  // Basic auth check
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Any authenticated user can reach this code
    }),

  // Public endpoint
  catalog: publicProcedure  // No auth required
    .query(async () => {
      // Anyone can reach this code
    }),
});
```

## Testing Checklist

Before deploying changes:

- [ ] All new endpoints have appropriate role middleware
- [ ] Admin role can access all endpoints
- [ ] Customer role cannot access admin/sales endpoints
- [ ] Sales role has appropriate access
- [ ] Packer role limited to packing operations
- [ ] Error messages don't leak role information
- [ ] Type checking passes
- [ ] Integration tests cover role scenarios
