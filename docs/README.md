# Jimmy's Beef ERP - Documentation

## Security Documentation

This directory contains comprehensive security documentation for the ERP system.

### 📚 Documentation Index

#### 1. [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
**Purpose:** Technical overview of Role-Based Access Control implementation

**Contents:**
- Role hierarchy and definitions
- Security model architecture
- Endpoint protection mechanisms
- Implementation details
- Testing procedures
- Troubleshooting guide

**Audience:** Developers, Security Team

---

#### 2. [Endpoint Security Matrix](./ENDPOINT_SECURITY_MATRIX.md)
**Purpose:** Complete reference of all API endpoints and their security requirements

**Contents:**
- Comprehensive endpoint listing
- Required roles for each endpoint
- Access level indicators
- Security considerations
- Code examples
- Testing checklist

**Audience:** Developers, QA Team, Security Auditors

---

#### 3. [Clerk Setup Guide](./CLERK_SETUP_GUIDE.md)
**Purpose:** Step-by-step guide for configuring user roles in Clerk

**Contents:**
- Role assignment methods (Dashboard, API, Admin Panel)
- Valid roles reference
- Testing procedures
- Troubleshooting common issues
- Security best practices
- Initial setup instructions

**Audience:** System Administrators, DevOps, Support Team

---

## Quick Start

### For Developers

1. **Understand RBAC**: Read [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
2. **Check Endpoint Requirements**: Reference [Endpoint Security Matrix](./ENDPOINT_SECURITY_MATRIX.md)
3. **Implement Security**: Use existing middleware or create new with `hasRole()`

### For System Administrators

1. **Initial Setup**: Follow [Clerk Setup Guide](./CLERK_SETUP_GUIDE.md)
2. **Assign Roles**: Use Clerk Dashboard or Backend API
3. **Test Access**: Verify users can access appropriate endpoints

### For QA Team

1. **Review Requirements**: Check [Endpoint Security Matrix](./ENDPOINT_SECURITY_MATRIX.md)
2. **Test Roles**: Follow test plan in [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
3. **Report Issues**: Document any authorization failures

## Security Overview

### Role Hierarchy

```
┌─────────────────────────────────────────┐
│              ADMIN                      │
│         (Full Access)                   │
└─────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       ↓                     ↓
┌─────────────┐       ┌─────────────┐
│   SALES     │       │   MANAGER   │
│ (Customer,  │       │ (Sales +    │
│  Orders,    │       │  Analytics) │
│  Pricing)   │       │             │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   PACKER    │       │   DRIVER    │
│ (Warehouse) │       │ (Delivery)  │
└─────────────┘       └─────────────┘

┌─────────────────────────────────────────┐
│            CUSTOMER                     │
│        (Own Data Only)                  │
└─────────────────────────────────────────┘
```

### Security Principles

1. **Authentication First**: All endpoints require Clerk authentication
2. **Role-Based Authorization**: Use allowlist approach (explicit roles)
3. **Least Privilege**: Default to customer role with minimal access
4. **Admin Bypass**: Admin role has superuser access to all endpoints
5. **Generic Errors**: Prevent role enumeration with generic messages

## Common Tasks

### Adding a New Endpoint

1. **Choose Middleware**: Select appropriate role requirement
   ```typescript
   // Admin only
   myEndpoint: isAdmin.mutation(...)

   // Admin or Sales
   myEndpoint: isAdminOrSales.query(...)

   // Any authenticated user
   myEndpoint: protectedProcedure.query(...)

   // Public (no auth)
   myEndpoint: publicProcedure.query(...)
   ```

2. **Update Documentation**: Add to [Endpoint Security Matrix](./ENDPOINT_SECURITY_MATRIX.md)

3. **Test All Roles**: Verify correct access for each role

### Assigning a New Role

1. **Via Clerk Dashboard**:
   - Users → Select User → Public Metadata
   - Add: `{ "role": "admin" }`
   - Save

2. **Via API**:
   ```typescript
   const client = await clerkClient();
   await client.users.updateUser(userId, {
     publicMetadata: { role: 'admin' }
   });
   ```

### Testing Role Access

```typescript
// Test admin access
const adminUser = await signInAsAdmin();
const stats = await trpc.dashboard.getStats.query(); // Should succeed

// Test customer access
const customerUser = await signInAsCustomer();
try {
  await trpc.dashboard.getStats.query(); // Should fail
} catch (error) {
  expect(error.code).toBe('FORBIDDEN');
}
```

## Security Checklist

Before production deployment:

- [ ] All sensitive endpoints have role middleware
- [ ] Admin role is assigned to authorized users only
- [ ] Customer role cannot access admin/sales endpoints
- [ ] Error messages don't leak role information
- [ ] Role assignments are documented
- [ ] Test users have appropriate roles
- [ ] Clerk environment variables are set
- [ ] Regular security audits are scheduled

## Troubleshooting

### User Can't Access Endpoint

1. Check user's role in Clerk Dashboard
2. Verify endpoint requires that role (see [Matrix](./ENDPOINT_SECURITY_MATRIX.md))
3. Ask user to logout/login to refresh session
4. Check server logs for authorization errors

### Role Not Being Applied

1. Verify role is in `publicMetadata` (not `privateMetadata`)
2. Check role spelling (must be lowercase, exact match)
3. Clear browser cache and cookies
4. Check Clerk API key is configured correctly

### Need Help?

- **Documentation**: Read relevant guide above
- **Code Examples**: See [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
- **Clerk Issues**: Check [Clerk Setup Guide](./CLERK_SETUP_GUIDE.md)
- **Security Questions**: Consult security team

## Contributing

When updating security documentation:

1. Keep all three documents in sync
2. Update this README if adding new docs
3. Include code examples where helpful
4. Test all documented procedures
5. Review with security team before merging

## Resources

### External Documentation
- [Clerk User Metadata](https://clerk.com/docs/users/metadata)
- [tRPC Middleware](https://trpc.io/docs/server/middlewares)
- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### Internal Resources
- API Package: `/packages/api/src/`
- Context Types: `/packages/api/src/context.ts`
- Middleware: `/packages/api/src/trpc.ts`
- Route Handlers:
  - Admin: `/apps/admin-portal/app/api/trpc/[trpc]/route.ts`
  - Customer: `/apps/customer-portal/app/api/trpc/[trpc]/route.ts`

---

**Last Updated:** 2025-01-19
**Version:** 1.0.0
**Maintained By:** Security Engineering Team
