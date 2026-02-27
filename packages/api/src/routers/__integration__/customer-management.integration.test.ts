import { describe, it, expect, beforeEach } from 'vitest';
import { adminCaller, customerCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestCustomer } from '../../test-utils/factories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid ABN that passes the Australian checksum algorithm (Qantas). */
const VALID_ABN_1 = '16009661901';
/** Builds a minimal-but-valid input object for the customer.register endpoint. */
function buildRegistrationInput(overrides: Record<string, unknown> = {}) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    clerkUserId: `user_register_${unique}`,
    accountType: 'company' as const,
    businessName: `Integration Test Pty Ltd ${unique}`,
    abn: VALID_ABN_1,
    contactPerson: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: `jane.doe.${unique}@test.com`,
      phone: '0412345678',
    },
    deliveryAddress: {
      street: '100 Collins Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
    },
    directors: [
      {
        familyName: 'Doe',
        givenNames: 'Jane',
        residentialAddress: {
          street: '1 Home Road',
          suburb: 'Richmond',
          state: 'VIC',
          postcode: '3121',
        },
        dateOfBirth: '1990-01-15',
        driverLicenseNumber: 'DL12345678',
        licenseState: 'VIC' as const,
        licenseExpiry: '2028-12-31',
      },
    ],
    signatures: [
      {
        directorIndex: 0,
        applicantSignatureUrl: 'https://example.com/sig-applicant.png',
        applicantSignedAt: new Date(),
        guarantorSignatureUrl: 'https://example.com/sig-guarantor.png',
        guarantorSignedAt: new Date(),
        witnessName: 'John Witness',
        witnessSignatureUrl: 'https://example.com/sig-witness.png',
        witnessSignedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Customer Management Integration', () => {
  beforeEach(async () => {
    await cleanAllData();
  });

  // =========================================================================
  // Customer Registration
  // =========================================================================
  describe('Customer Registration', () => {
    it('should register a customer with valid data', async () => {
      const admin = adminCaller();
      const input = buildRegistrationInput();

      const result = await admin.customer.register(input);

      expect(result).toBeDefined();
      expect(result.customerId).toBeDefined();
      expect(typeof result.customerId).toBe('string');

      // Verify the customer was persisted
      const fetched = await admin.customer.getById({ customerId: result.customerId });
      expect(fetched.businessName).toBe(input.businessName);
      expect(fetched.abn).toBe(input.abn);
      expect(fetched.status).toBe('active');
      expect(fetched.contactPerson.email).toBe(input.contactPerson.email);
      expect(fetched.deliveryAddress.street).toBe(input.deliveryAddress.street);
      expect(fetched.creditApplication.status).toBe('pending');
    });

    it('should reject registration with a duplicate ABN from an active customer', async () => {
      const admin = adminCaller();

      // Register the first customer
      const firstInput = buildRegistrationInput({ abn: VALID_ABN_1 });
      await admin.customer.register(firstInput);

      // Attempt to register a second customer with the same ABN
      const secondInput = buildRegistrationInput({
        abn: VALID_ABN_1,
        clerkUserId: `user_dup_${Date.now()}`,
        contactPerson: {
          firstName: 'Bob',
          lastName: 'Smith',
          email: `bob.smith.${Date.now()}@test.com`,
          phone: '0498765432',
        },
      });

      await expect(admin.customer.register(secondInput)).rejects.toThrow(
        /active customer with this ABN already exists/i
      );
    });

    it('should allow a customer to retrieve their own profile after registration', async () => {
      const clerkUserId = `user_profile_${Date.now()}`;
      const admin = adminCaller();
      const input = buildRegistrationInput({ clerkUserId });

      const registration = await admin.customer.register(input);
      expect(registration.customerId).toBeDefined();

      // Create a caller whose userId matches the registered customer's clerkUserId
      const customer = customerCaller(clerkUserId);
      const profile = await customer.customer.getProfile();

      expect(profile).toBeDefined();
      expect(profile.id).toBe(registration.customerId);
      expect(profile.businessName).toBe(input.businessName);
      expect(profile.contactPerson.email).toBe(input.contactPerson.email);
      expect(profile.usedCredit).toBe(0);
    });
  });

  // =========================================================================
  // Status Transitions
  // =========================================================================
  describe('Status Transitions', () => {
    it('should allow an admin to suspend an active customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      const suspended = await admin.customer.suspend({
        customerId: customer.id,
        reason: 'Overdue payment for more than 90 days',
      });

      expect(suspended.status).toBe('suspended');
      expect(suspended.suspensionReason).toBe('Overdue payment for more than 90 days');
      expect(suspended.suspendedAt).toBeDefined();
    });

    it('should allow an admin to activate a suspended customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      // First suspend the customer
      await admin.customer.suspend({
        customerId: customer.id,
        reason: 'Temporary suspension for account review',
      });

      // Then re-activate
      const activated = await admin.customer.activate({
        customerId: customer.id,
        notes: 'Payment received, reactivating account',
      });

      expect(activated.status).toBe('active');
      expect(activated.suspensionReason).toBeNull();
      expect(activated.suspendedAt).toBeNull();
      expect(activated.suspendedBy).toBeNull();
    });

    it('should allow an admin to close a customer account', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      const closed = await admin.customer.close({
        customerId: customer.id,
        reason: 'Business permanently ceased operations',
      });

      expect(closed.status).toBe('closed');
      expect(closed.closureReason).toBe('Business permanently ceased operations');
      expect(closed.closedAt).toBeDefined();
      // clerkUserId is modified to allow email re-registration
      expect(closed.clerkUserId).toContain('_closed_');
    });

    it('should reject suspending an already-suspended customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      await admin.customer.suspend({
        customerId: customer.id,
        reason: 'First suspension for compliance',
      });

      await expect(
        admin.customer.suspend({
          customerId: customer.id,
          reason: 'Attempting a second suspension',
        })
      ).rejects.toThrow(/already suspended/i);
    });

    it('should reject activating a customer that is not suspended', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      await expect(
        admin.customer.activate({
          customerId: customer.id,
        })
      ).rejects.toThrow(/not suspended/i);
    });

    it('should reject closing an already-closed customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ status: 'active' });

      await admin.customer.close({
        customerId: customer.id,
        reason: 'Business permanently ceased operations',
      });

      await expect(
        admin.customer.close({
          customerId: customer.id,
          reason: 'Attempting to close again',
        })
      ).rejects.toThrow(/already closed/i);
    });
  });

  // =========================================================================
  // Credit Application
  // =========================================================================
  describe('Credit Application', () => {
    it('should allow an admin to approve credit for a customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ creditStatus: 'pending', creditLimit: 0 });

      const approved = await admin.customer.approveCredit({
        customerId: customer.id,
        creditLimit: 1000000, // $10,000 in cents
        paymentTerms: 'Net 30',
        notes: 'Good credit history verified',
      });

      expect(approved.creditApplication.status).toBe('approved');
      expect(approved.creditApplication.creditLimit).toBe(1000000);
      expect(approved.creditApplication.paymentTerms).toBe('Net 30');
      expect(approved.creditApplication.notes).toBe('Good credit history verified');
      expect(approved.creditApplication.reviewedAt).toBeDefined();
    });

    it('should allow an admin to reject credit for a customer', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ creditStatus: 'pending', creditLimit: 0 });

      const rejected = await admin.customer.rejectCredit({
        customerId: customer.id,
        notes: 'Insufficient trade references provided',
      });

      expect(rejected.creditApplication.status).toBe('rejected');
      expect(rejected.creditApplication.notes).toBe('Insufficient trade references provided');
      expect(rejected.creditApplication.reviewedAt).toBeDefined();
    });

    it('should not approve credit that has already been approved (idempotent)', async () => {
      const admin = adminCaller();
      const customer = await createTestCustomer({ creditStatus: 'pending', creditLimit: 0 });

      // First approval
      await admin.customer.approveCredit({
        customerId: customer.id,
        creditLimit: 500000,
        paymentTerms: 'Net 14',
      });

      // Second approval should succeed idempotently (returns already-approved customer)
      const result = await admin.customer.approveCredit({
        customerId: customer.id,
        creditLimit: 800000,
        paymentTerms: 'Net 30',
      });

      // The original credit limit should be preserved (idempotent)
      expect(result.creditApplication.status).toBe('approved');
      expect(result.creditApplication.creditLimit).toBe(500000);
    });
  });
});
