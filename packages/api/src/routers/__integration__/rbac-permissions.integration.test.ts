import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  createTestCaller,
  adminCaller,
  salesCaller,
  customerCaller,
  packerCaller,
  driverCaller,
  managerCaller,
} from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { DEFAULT_ROLE_PERMISSIONS } from '@joho-erp/shared';
import type { Permission, UserRole } from '@joho-erp/shared';
import { hasPermission } from '../../services/permission-service';

// Cast the mocked module so we can control its behavior per-test
const mockHasPermission = vi.mocked(hasPermission);

/**
 * Realistic permission check using DEFAULT_ROLE_PERMISSIONS.
 * Admin always passes; other roles are checked against their default permission set.
 */
function realisticHasPermission(role: UserRole, permission: Permission): Promise<boolean> {
  if (role === 'admin') return Promise.resolve(true);
  const perms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  return Promise.resolve(perms.includes(permission));
}

describe('RBAC Permissions Integration', () => {
  beforeAll(async () => {
    await cleanAllData();
  });

  afterAll(async () => {
    await cleanAllData();
  });

  beforeEach(() => {
    // Override the global mock so permission checks use realistic role-based logic
    mockHasPermission.mockImplementation(realisticHasPermission);
  });

  // ------------------------------------------------------------------
  // Unauthenticated access
  // ------------------------------------------------------------------
  describe('Unauthenticated access', () => {
    it('should reject unauthenticated access to protected routes', async () => {
      const unauthCaller = createTestCaller({ userId: '' });

      await expect(
        unauthCaller.order.getMyOrders({ page: 1, limit: 10 })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject unauthenticated access to permission-guarded routes', async () => {
      const unauthCaller = createTestCaller({ userId: '' });

      await expect(
        unauthCaller.order.getAll({ page: 1, limit: 10 })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ------------------------------------------------------------------
  // Customer role restrictions (customer has zero admin permissions)
  // ------------------------------------------------------------------
  describe('Customer role restrictions', () => {
    it('should deny customer access to order management (orders:view)', async () => {
      const caller = customerCaller();

      await expect(
        caller.order.getAll({ page: 1, limit: 10 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny customer access to customer management (customers:view)', async () => {
      const caller = customerCaller();

      await expect(
        caller.customer.getAll({ page: 1, limit: 10 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny customer access to packing routes (packing:view)', async () => {
      const caller = customerCaller();

      await expect(
        caller.packing.getSession({ deliveryDate: new Date().toISOString() })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny customer access to driver delivery routes (driver:view)', async () => {
      const caller = customerCaller();

      await expect(
        caller.delivery.getDriverDeliveries()
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny customer access to pricing management (pricing:edit)', async () => {
      const caller = customerCaller();

      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // ------------------------------------------------------------------
  // Packer role restrictions
  // Packer has: packing:view, packing:manage, orders:view, products:view
  // ------------------------------------------------------------------
  describe('Packer role restrictions', () => {
    it('should allow packer access to order viewing (orders:view)', async () => {
      const caller = packerCaller();

      // Packer has orders:view permission for viewing orders during packing
      const result = await caller.order.getAll({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('should deny packer access to customer management (customers:view)', async () => {
      const caller = packerCaller();

      await expect(
        caller.customer.getAll({ page: 1, limit: 10 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny packer access to pricing management (pricing:edit)', async () => {
      const caller = packerCaller();

      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny packer access to driver routes (driver:view)', async () => {
      const caller = packerCaller();

      await expect(
        caller.delivery.getDriverDeliveries()
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should allow packer access to packing routes (packing:view)', async () => {
      const caller = packerCaller();

      // Packer has packing:view; may throw non-FORBIDDEN errors if no data
      try {
        await caller.packing.getSession({ deliveryDate: new Date().toISOString() });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('FORBIDDEN');
        }
      }
    });
  });

  // ------------------------------------------------------------------
  // Driver role restrictions
  // Driver has: driver:view, driver:complete, driver:upload_pod, deliveries:view
  // ------------------------------------------------------------------
  describe('Driver role restrictions', () => {
    it('should deny driver access to order management (orders:view)', async () => {
      const caller = driverCaller();

      await expect(
        caller.order.getAll({ page: 1, limit: 10 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny driver access to packing routes (packing:view)', async () => {
      const caller = driverCaller();

      await expect(
        caller.packing.getSession({ deliveryDate: new Date().toISOString() })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny driver access to customer management (customers:view)', async () => {
      const caller = driverCaller();

      await expect(
        caller.customer.getAll({ page: 1, limit: 10 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny driver access to pricing management (pricing:edit)', async () => {
      const caller = driverCaller();

      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should allow driver access to driver delivery routes (driver:view)', async () => {
      const caller = driverCaller();

      // Driver has driver:view; should not throw FORBIDDEN
      try {
        const result = await caller.delivery.getDriverDeliveries();
        expect(result).toBeDefined();
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('FORBIDDEN');
          expect(error.code).not.toBe('UNAUTHORIZED');
        }
      }
    });
  });

  // ------------------------------------------------------------------
  // Sales role access
  // Sales has: dashboard:view, customers:view, customers:create, customers:edit,
  //   suppliers:view, orders:view, orders:create, orders:edit, products:view,
  //   pricing:view, pricing:create, pricing:edit, deliveries:view, settings:view
  // ------------------------------------------------------------------
  describe('Sales role access', () => {
    it('should allow sales access to order management (orders:view)', async () => {
      const caller = salesCaller();

      const result = await caller.order.getAll({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('should allow sales access to customer management (customers:view)', async () => {
      const caller = salesCaller();

      const result = await caller.customer.getAll({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('should allow sales access to pricing edit (pricing:edit)', async () => {
      const caller = salesCaller();

      // Sales has pricing:edit; will fail with NOT_FOUND (fake customer) not FORBIDDEN
      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should deny sales access to packing routes (packing:view)', async () => {
      const caller = salesCaller();

      await expect(
        caller.packing.getSession({ deliveryDate: new Date().toISOString() })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should deny sales access to driver routes (driver:view)', async () => {
      const caller = salesCaller();

      await expect(
        caller.delivery.getDriverDeliveries()
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // ------------------------------------------------------------------
  // Manager role access
  // Manager has: dashboard:view, customers:view, customers:edit, customers:delete,
  //   customers:approve_credit, suppliers:view, suppliers:edit, orders:view,
  //   orders:confirm, orders:cancel, orders:approve_backorder, products:view,
  //   products:edit, products:adjust_stock, inventory:view, inventory:adjust,
  //   inventory:export, pricing:view, pricing:edit, packing:view, packing:manage,
  //   deliveries:view, deliveries:manage, settings:view, ...
  // ------------------------------------------------------------------
  describe('Manager role access', () => {
    it('should allow manager access to order management (orders:view)', async () => {
      const caller = managerCaller();

      const result = await caller.order.getAll({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('should allow manager access to customer management (customers:view)', async () => {
      const caller = managerCaller();

      const result = await caller.customer.getAll({ page: 1, limit: 10 });
      expect(result).toBeDefined();
    });

    it('should allow manager access to packing routes (packing:view)', async () => {
      const caller = managerCaller();

      // Manager has packing:view; may throw non-FORBIDDEN errors if no data
      try {
        await caller.packing.getSession({ deliveryDate: new Date().toISOString() });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('FORBIDDEN');
        }
      }
    });

    it('should allow manager access to pricing edit (pricing:edit)', async () => {
      const caller = managerCaller();

      // Manager has pricing:edit; will fail with NOT_FOUND (fake customer) not FORBIDDEN
      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should deny manager access to driver-specific routes (driver:view)', async () => {
      const caller = managerCaller();

      await expect(
        caller.delivery.getDriverDeliveries()
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // ------------------------------------------------------------------
  // Admin superuser bypass
  // ------------------------------------------------------------------
  describe('Admin superuser bypass', () => {
    it('should allow admin access to order management', async () => {
      const caller = adminCaller();

      const orders = await caller.order.getAll({ page: 1, limit: 10 });
      expect(orders).toBeDefined();
    });

    it('should allow admin access to customer management', async () => {
      const caller = adminCaller();

      const customers = await caller.customer.getAll({ page: 1, limit: 10 });
      expect(customers).toBeDefined();
    });

    it('should allow admin access to packing routes', async () => {
      const caller = adminCaller();

      // Should not throw FORBIDDEN; may throw other errors if no data
      try {
        await caller.packing.getSession({ deliveryDate: new Date().toISOString() });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('FORBIDDEN');
          expect(error.code).not.toBe('UNAUTHORIZED');
        }
      }
    });

    it('should allow admin access to driver delivery routes', async () => {
      const caller = adminCaller();

      // Should not throw FORBIDDEN
      try {
        const result = await caller.delivery.getDriverDeliveries();
        expect(result).toBeDefined();
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('FORBIDDEN');
          expect(error.code).not.toBe('UNAUTHORIZED');
        }
      }
    });

    it('should allow admin access to pricing management', async () => {
      const caller = adminCaller();

      // Will fail with NOT_FOUND (fake customer) but should NOT be FORBIDDEN
      await expect(
        caller.pricing.setCustomerPrice({
          customerId: 'fake-id',
          productId: 'fake-id',
          customPrice: 1000,
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  // ------------------------------------------------------------------
  // Cross-role permission matrix validation
  // ------------------------------------------------------------------
  describe('Permission matrix: DEFAULT_ROLE_PERMISSIONS validation', () => {
    it('packer should have packing:view permission', async () => {
      const result = await realisticHasPermission('packer', 'packing:view');
      expect(result).toBe(true);
    });

    it('packer should have orders:view permission', async () => {
      const result = await realisticHasPermission('packer', 'orders:view');
      expect(result).toBe(true);
    });

    it('packer should NOT have customers:view permission', async () => {
      const result = await realisticHasPermission('packer', 'customers:view');
      expect(result).toBe(false);
    });

    it('driver should have driver:view permission', async () => {
      const result = await realisticHasPermission('driver', 'driver:view');
      expect(result).toBe(true);
    });

    it('driver should NOT have packing:view permission', async () => {
      const result = await realisticHasPermission('driver', 'packing:view');
      expect(result).toBe(false);
    });

    it('driver should NOT have orders:view permission', async () => {
      const result = await realisticHasPermission('driver', 'orders:view');
      expect(result).toBe(false);
    });

    it('customer should have no admin permissions', () => {
      const customerPerms = DEFAULT_ROLE_PERMISSIONS['customer'];
      expect(customerPerms).toEqual([]);
    });

    it('sales should have pricing:view and pricing:edit', async () => {
      const hasPricingView = await realisticHasPermission('sales', 'pricing:view');
      const hasPricingEdit = await realisticHasPermission('sales', 'pricing:edit');
      expect(hasPricingView).toBe(true);
      expect(hasPricingEdit).toBe(true);
    });

    it('sales should NOT have packing:view or driver:view', async () => {
      const hasPackingView = await realisticHasPermission('sales', 'packing:view');
      const hasDriverView = await realisticHasPermission('sales', 'driver:view');
      expect(hasPackingView).toBe(false);
      expect(hasDriverView).toBe(false);
    });

    it('manager should have packing:view and packing:manage', async () => {
      const hasPackingView = await realisticHasPermission('manager', 'packing:view');
      const hasPackingManage = await realisticHasPermission('manager', 'packing:manage');
      expect(hasPackingView).toBe(true);
      expect(hasPackingManage).toBe(true);
    });

    it('manager should NOT have driver:view', async () => {
      const hasDriverView = await realisticHasPermission('manager', 'driver:view');
      expect(hasDriverView).toBe(false);
    });

    it('admin should bypass all permission checks', async () => {
      const hasCustomersView = await realisticHasPermission('admin', 'customers:view');
      const hasDriverView = await realisticHasPermission('admin', 'driver:view');
      const hasPackingView = await realisticHasPermission('admin', 'packing:view');
      const hasPricingEdit = await realisticHasPermission('admin', 'pricing:edit');
      expect(hasCustomersView).toBe(true);
      expect(hasDriverView).toBe(true);
      expect(hasPackingView).toBe(true);
      expect(hasPricingEdit).toBe(true);
    });
  });
});
