# Clerk Setup Guide for RBAC

## Overview

This guide explains how to configure Clerk to support Role-Based Access Control (RBAC) in the Joho Foods ERP system.

## Initial Setup

### 1. Clerk Account Configuration

Ensure you have:
- A Clerk account with your application configured
- Environment variables set in both portals:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

### 2. User Role Assignment Methods

Clerk stores user roles in the `publicMetadata` field. There are three ways to assign roles:

#### Method 1: Clerk Dashboard (Recommended for Manual Assignment)

**Steps:**
1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** in the sidebar
3. Click on the user you want to assign a role to
4. Scroll to **Public metadata** section
5. Click **Edit**
6. Add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
7. Replace `"admin"` with one of the valid roles:
   - `admin` - Full system access
   - `sales` - Sales team member
   - `manager` - Department manager
   - `packer` - Warehouse staff
   - `driver` - Delivery driver
   - `customer` - End customer (default)
8. Click **Save**

**Screenshot Locations:**
- Public metadata is in the user detail page
- It's a JSON editor that accepts any valid JSON

#### Method 2: Backend API (Recommended for Automation)

Use this method when you need to assign roles programmatically.

**Example - Set User Role:**
```typescript
import { clerkClient } from '@clerk/nextjs/server';

async function setUserRole(
  userId: string,
  role: 'admin' | 'sales' | 'manager' | 'packer' | 'driver' | 'customer'
) {
  const client = await clerkClient();

  await client.users.updateUser(userId, {
    publicMetadata: {
      role: role
    }
  });

  console.log(`Assigned role '${role}' to user ${userId}`);
}

// Usage
await setUserRole('user_abc123', 'admin');
```

**Example - Batch Role Assignment:**
```typescript
import { clerkClient } from '@clerk/nextjs/server';

async function batchAssignRoles(assignments: Array<{ userId: string; role: string }>) {
  const client = await clerkClient();

  for (const { userId, role } of assignments) {
    try {
      await client.users.updateUser(userId, {
        publicMetadata: { role }
      });
      console.log(`✅ Assigned ${role} to ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to assign role to ${userId}:`, error);
    }
  }
}

// Usage
await batchAssignRoles([
  { userId: 'user_123', role: 'admin' },
  { userId: 'user_456', role: 'sales' },
  { userId: 'user_789', role: 'packer' },
]);
```

#### Method 3: Custom Admin Panel (Future Enhancement)

You could build an admin panel that uses the Backend API to manage roles:

```typescript
// app/admin/users/page.tsx
'use client';

import { useState } from 'react';

export default function UserManagement() {
  const [selectedRole, setSelectedRole] = useState('customer');

  async function updateUserRole(userId: string) {
    const response = await fetch('/api/admin/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: selectedRole })
    });

    if (response.ok) {
      alert('Role updated successfully');
    }
  }

  return (
    <div>
      <h1>User Management</h1>
      {/* User list and role assignment UI */}
    </div>
  );
}
```

```typescript
// app/api/admin/assign-role/route.ts
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Verify requester is admin
  const { userId: requesterId } = await auth();
  if (!requesterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clerkClient();
  const requester = await client.users.getUser(requesterId);

  if (requester.publicMetadata.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Assign role
  const { userId, role } = await req.json();

  await client.users.updateUser(userId, {
    publicMetadata: { role }
  });

  return NextResponse.json({ success: true });
}
```

## Valid Roles Reference

| Role | Purpose | Default Access |
|------|---------|----------------|
| `admin` | System administrator | All endpoints |
| `sales` | Sales team member | Customer management, orders, pricing, deliveries |
| `manager` | Department manager | Similar to sales with analytics |
| `packer` | Warehouse staff | Packing interface and stock management |
| `driver` | Delivery driver | Delivery management and updates |
| `customer` | End customer | Own profile and orders only |

## Default Behavior

- If `publicMetadata.role` is **not set**: User defaults to `customer` role
- If `publicMetadata.role` is **invalid**: User defaults to `customer` role
- Empty string `""` is treated as `customer`
- Role is **case-sensitive**: use lowercase only

## Testing Role Assignment

### 1. Verify Role in Dashboard

After assigning a role:
1. Go to Clerk Dashboard
2. Navigate to Users → (select user)
3. Check Public metadata section
4. Confirm role is set correctly

### 2. Test API Access

**Admin Test:**
```javascript
// Should succeed for admin users
const stats = await trpc.dashboard.getStats.query();
console.log('Admin access confirmed:', stats);
```

**Sales Test:**
```javascript
// Should succeed for sales/admin users
const customers = await trpc.customer.getAll.query({ page: 1 });
console.log('Sales access confirmed:', customers);
```

**Customer Test:**
```javascript
// Should succeed for all authenticated users
const profile = await trpc.customer.getProfile.query();
console.log('Customer access confirmed:', profile);

// Should fail for customer role (FORBIDDEN)
try {
  await trpc.dashboard.getStats.query();
} catch (error) {
  console.log('Correctly blocked:', error.message);
}
```

## Common Issues and Solutions

### Issue: Role Not Being Applied

**Symptoms:**
- User assigned role in Clerk but still gets FORBIDDEN errors
- Server logs show role as 'customer' instead of assigned role

**Solutions:**
1. **Clear session**: User needs to log out and log back in
2. **Check spelling**: Role must be exact (lowercase, no spaces)
3. **Verify metadata**: Ensure it's in `publicMetadata`, not `privateMetadata`
4. **Check server logs**: Look for Clerk API errors in console

### Issue: Can't Assign Roles

**Symptoms:**
- Clerk Dashboard doesn't show Public metadata section
- API calls to update metadata fail

**Solutions:**
1. **Check permissions**: Ensure you have admin access to Clerk Dashboard
2. **Verify API key**: Ensure `CLERK_SECRET_KEY` is set correctly
3. **Rate limiting**: Clerk may rate limit API calls
4. **Account tier**: Some Clerk plans may have limitations

### Issue: Admin Still Gets FORBIDDEN

**Symptoms:**
- User with admin role can't access endpoints
- Even dashboard endpoints fail

**Solutions:**
1. **Verify implementation**: Ensure middleware checks admin bypass
2. **Check context**: Ensure role is being passed in tRPC context
3. **Review logs**: Look for middleware errors in server console
4. **Test with simple endpoint**: Try a known working endpoint first

## Security Best Practices

### 1. Protect Role Assignment

Only admins should be able to assign roles:
- Keep role assignment endpoints secured
- Validate requester has admin role
- Log all role changes for audit

### 2. Use Environment-Specific Roles

Consider different role assignments for:
- **Development**: More permissive for testing
- **Staging**: Mirror production roles
- **Production**: Strict role enforcement

### 3. Regular Audits

Periodically review:
- Who has admin access
- Unused accounts with elevated roles
- Role assignments vs. actual job functions

### 4. Principle of Least Privilege

- Start users with `customer` role
- Elevate only when needed
- Remove elevated roles when no longer needed

## Initial Admin Setup

When first deploying the system:

1. **Identify Super Admin**: Choose the first admin user
2. **Assign Admin Role**: Use Clerk Dashboard to set their role to `admin`
3. **Verify Access**: Test admin can access all endpoints
4. **Create Other Admins**: Use admin account to assign additional admin roles
5. **Document Process**: Keep track of who has admin access

## Example: Setting Up Test Users

```typescript
// scripts/setup-test-users.ts
import { clerkClient } from '@clerk/nextjs/server';

const testUsers = [
  { email: 'admin@test.com', role: 'admin' },
  { email: 'sales@test.com', role: 'sales' },
  { email: 'packer@test.com', role: 'packer' },
  { email: 'driver@test.com', role: 'driver' },
  { email: 'customer@test.com', role: 'customer' },
];

async function setupTestUsers() {
  const client = await clerkClient();

  // Get all users
  const { data: users } = await client.users.getUserList();

  for (const testUser of testUsers) {
    // Find user by email
    const user = users.find(u =>
      u.emailAddresses.some(e => e.emailAddress === testUser.email)
    );

    if (user) {
      await client.users.updateUser(user.id, {
        publicMetadata: { role: testUser.role }
      });
      console.log(`✅ Assigned ${testUser.role} to ${testUser.email}`);
    } else {
      console.log(`⚠️  User not found: ${testUser.email}`);
    }
  }
}

// Run: ts-node scripts/setup-test-users.ts
setupTestUsers();
```

## Monitoring and Logging

Consider implementing:

1. **Role Change Audit Log**: Track when roles are assigned/changed
2. **Access Attempt Logging**: Log failed authorization attempts
3. **Role Usage Analytics**: Monitor which roles are most used
4. **Anomaly Detection**: Alert on unusual role-based access patterns

## Resources

- [Clerk User Metadata Docs](https://clerk.com/docs/users/metadata)
- [Clerk Backend API Reference](https://clerk.com/docs/reference/backend-api)
- [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
- [Endpoint Security Matrix](./ENDPOINT_SECURITY_MATRIX.md)
