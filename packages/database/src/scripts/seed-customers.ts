/**
 * Database Seed Script: Create Test Customers
 *
 * This script creates test customers with valid Australian addresses, proper ABN/ACN
 * numbers, and realistic business data for testing and development.
 *
 * Usage:
 *   pnpm db:seed-customers --dry-run              # Preview customers to be created
 *   pnpm db:seed-customers --count 20 --confirm   # Create 20 customers
 *   pnpm db:seed-customers --confirm              # Create 10 customers (default)
 */

import { PrismaClient, AccountType, CreditApplicationStatus, CustomerStatus, SignatureType } from '../generated/prisma';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// ============================================================================
// ABN/ACN Generation
// ============================================================================

/**
 * ABN weights for checksum calculation
 * ABN format: 11 digits, checksum must satisfy ((sum - 1) mod 89 === 0)
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/**
 * ACN weights for checksum calculation
 * ACN format: 9 digits, last digit is check digit
 */
const ACN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Generate a valid Australian Business Number (ABN)
 * ABN uses a weighted checksum: (sum - 1) mod 89 === 0
 */
function generateValidABN(): string {
  // Generate 10 random digits (the first digit will be calculated)
  const digits: number[] = [];

  // First digit (before checksum adjustment) should be 1-9
  digits.push(Math.floor(Math.random() * 9) + 1);

  // Generate remaining 9 digits (0-9)
  for (let i = 1; i < 10; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  // Calculate what the first digit needs to be for valid checksum
  // The first digit is subtracted by 1 in the algorithm
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const weight = ABN_WEIGHTS[i + 1]; // Skip first weight for now
    sum += digits[i] * weight;
  }

  // Find the first digit that makes (totalSum - 1) mod 89 === 0
  // totalSum = firstDigit * 10 + sum (where firstDigit is adjusted by -1)
  // We need: ((firstDigit - 1) * 10 + sum - 1) mod 89 === 0
  // So: (firstDigit * 10 - 10 + sum - 1) mod 89 === 0
  // So: (firstDigit * 10 + sum - 11) mod 89 === 0
  // So: firstDigit * 10 mod 89 === (11 - sum mod 89) mod 89

  for (let firstDigit = 1; firstDigit <= 9; firstDigit++) {
    const totalSum = (firstDigit - 1) * ABN_WEIGHTS[0] + sum;
    if ((totalSum - 1) % 89 === 0) {
      return firstDigit.toString() + digits.join('');
    }
  }

  // If no valid first digit found, try a different base number
  return generateValidABN();
}

/**
 * Validate an ABN using the checksum algorithm
 */
function isValidABN(abn: string): boolean {
  if (!/^\d{11}$/.test(abn)) return false;

  const digits = abn.split('').map(Number);
  // Subtract 1 from first digit
  digits[0] = digits[0] - 1;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * ABN_WEIGHTS[i];
  }

  return (sum - 1) % 89 === 0;
}

/**
 * Generate a valid Australian Company Number (ACN)
 * ACN uses a weighted checksum with check digit at the end
 */
function generateValidACN(): string {
  // Generate 8 random digits
  const digits: number[] = [];
  for (let i = 0; i < 8; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * ACN_WEIGHTS[i];
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return digits.join('') + checkDigit.toString();
}

// ============================================================================
// Melbourne Suburb Data
// ============================================================================

interface SuburbData {
  suburb: string;
  postcode: string;
  region: 'north' | 'south' | 'east' | 'west';
  latitude: number;
  longitude: number;
}

const MELBOURNE_SUBURBS: SuburbData[] = [
  // North
  { suburb: 'Preston', postcode: '3072', region: 'north', latitude: -37.7461, longitude: 145.0017 },
  { suburb: 'Coburg', postcode: '3058', region: 'north', latitude: -37.7444, longitude: 144.9667 },
  { suburb: 'Brunswick', postcode: '3056', region: 'north', latitude: -37.7669, longitude: 144.9603 },
  { suburb: 'Northcote', postcode: '3070', region: 'north', latitude: -37.7700, longitude: 145.0028 },
  { suburb: 'Reservoir', postcode: '3073', region: 'north', latitude: -37.7167, longitude: 145.0000 },
  { suburb: 'Thornbury', postcode: '3071', region: 'north', latitude: -37.7550, longitude: 145.0058 },
  { suburb: 'Fitzroy', postcode: '3065', region: 'north', latitude: -37.7897, longitude: 144.9789 },
  { suburb: 'Collingwood', postcode: '3066', region: 'north', latitude: -37.8016, longitude: 144.9891 },

  // South
  { suburb: 'St Kilda', postcode: '3182', region: 'south', latitude: -37.8672, longitude: 144.9811 },
  { suburb: 'Brighton', postcode: '3186', region: 'south', latitude: -37.9056, longitude: 145.0056 },
  { suburb: 'Elwood', postcode: '3184', region: 'south', latitude: -37.8833, longitude: 144.9833 },
  { suburb: 'Moorabbin', postcode: '3189', region: 'south', latitude: -37.9361, longitude: 145.0417 },
  { suburb: 'Bentleigh', postcode: '3204', region: 'south', latitude: -37.9200, longitude: 145.0300 },
  { suburb: 'Caulfield', postcode: '3162', region: 'south', latitude: -37.8833, longitude: 145.0333 },
  { suburb: 'South Yarra', postcode: '3141', region: 'south', latitude: -37.8389, longitude: 145.0028 },
  { suburb: 'Prahran', postcode: '3181', region: 'south', latitude: -37.8500, longitude: 144.9917 },

  // East
  { suburb: 'Richmond', postcode: '3121', region: 'east', latitude: -37.8244, longitude: 145.0000 },
  { suburb: 'Camberwell', postcode: '3124', region: 'east', latitude: -37.8333, longitude: 145.0667 },
  { suburb: 'Hawthorn', postcode: '3122', region: 'east', latitude: -37.8222, longitude: 145.0333 },
  { suburb: 'Box Hill', postcode: '3128', region: 'east', latitude: -37.8194, longitude: 145.1222 },
  { suburb: 'Balwyn', postcode: '3103', region: 'east', latitude: -37.8125, longitude: 145.0792 },
  { suburb: 'Kew', postcode: '3101', region: 'east', latitude: -37.8000, longitude: 145.0333 },
  { suburb: 'Glen Waverley', postcode: '3150', region: 'east', latitude: -37.8789, longitude: 145.1650 },
  { suburb: 'Doncaster', postcode: '3108', region: 'east', latitude: -37.7833, longitude: 145.1167 },

  // West
  { suburb: 'Footscray', postcode: '3011', region: 'west', latitude: -37.8000, longitude: 144.9000 },
  { suburb: 'Williamstown', postcode: '3016', region: 'west', latitude: -37.8614, longitude: 144.8969 },
  { suburb: 'Yarraville', postcode: '3013', region: 'west', latitude: -37.8167, longitude: 144.8917 },
  { suburb: 'Altona', postcode: '3018', region: 'west', latitude: -37.8667, longitude: 144.8333 },
  { suburb: 'Sunshine', postcode: '3020', region: 'west', latitude: -37.7833, longitude: 144.8333 },
  { suburb: 'Maribyrnong', postcode: '3032', region: 'west', latitude: -37.7833, longitude: 144.8917 },
  { suburb: 'Seddon', postcode: '3011', region: 'west', latitude: -37.8089, longitude: 144.8931 },
  { suburb: 'Newport', postcode: '3015', region: 'west', latitude: -37.8428, longitude: 144.8836 },
];

// ============================================================================
// Business Name Generation
// ============================================================================

const FIRST_NAMES = [
  'James',
  'Michael',
  'David',
  'Robert',
  'John',
  'William',
  'Richard',
  'Joseph',
  'Thomas',
  'Christopher',
  'Sarah',
  'Jessica',
  'Emily',
  'Ashley',
  'Amanda',
  'Elizabeth',
  'Jennifer',
  'Linda',
  'Patricia',
  'Maria',
  'Wei',
  'Chen',
  'Ming',
  'Hui',
  'Xiao',
  'Giuseppe',
  'Antonio',
  'Marco',
  'Sofia',
  'Elena',
];

const LAST_NAMES = [
  'Smith',
  'Jones',
  'Williams',
  'Brown',
  'Wilson',
  'Taylor',
  'Johnson',
  'White',
  'Martin',
  'Anderson',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
  'Clark',
  'Rodriguez',
  'Lee',
  'Chen',
  'Wang',
  'Liu',
  'Nguyen',
  'Tran',
  'Patel',
  'Singh',
  'Kumar',
  'Rossi',
  'Romano',
  'Greco',
  'Colombo',
  'Ferrari',
];

const BUSINESS_NAME_TEMPLATES = [
  '{suburb} Grill House',
  "{name}'s Quality Meats",
  'The {suburb} Kitchen',
  '{suburb} Fine Dining',
  '{name} & Sons Butchery',
  'Golden {suburb} Restaurant',
  '{suburb} Catering Co',
  '{suburb} Hospitality Group',
  'The {suburb} Bistro',
  '{name} Family Restaurant',
  '{suburb} Food Services',
  '{suburb} Steakhouse',
  'Little {suburb} Cafe',
  '{suburb} Hotel & Restaurant',
  '{name} Brothers Meats',
  '{suburb} Premium Foods',
  'The {suburb} Eatery',
  '{suburb} Fresh Meats',
  '{name} Catering Services',
  '{suburb} Commercial Kitchen',
];

function generateBusinessName(suburb: string): string {
  const template = BUSINESS_NAME_TEMPLATES[Math.floor(Math.random() * BUSINESS_NAME_TEMPLATES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  return template.replace('{suburb}', suburb).replace('{name}', lastName);
}

function generateTradingName(businessName: string): string | null {
  // 30% chance to have a different trading name
  if (Math.random() > 0.3) return null;

  const shortNames = [
    businessName.split(' ')[0] + "'s",
    'The ' + businessName.split(' ')[0],
    businessName.replace(/\s+(Pty|Ltd|Co|Group|Services).*$/i, '').trim(),
  ];

  return shortNames[Math.floor(Math.random() * shortNames.length)];
}

// ============================================================================
// Customer Generation
// ============================================================================

interface GeneratedCustomer {
  clerkUserId: string;
  accountType: AccountType;
  businessName: string;
  tradingName: string | null;
  abn: string;
  acn: string | null;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile: string | null;
  };
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
    areaId: string | null;
    areaName: string | null;
    latitude: number;
    longitude: number;
    deliveryInstructions: string | null;
  };
  billingAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  } | null;
  creditApplication: {
    status: CreditApplicationStatus;
    creditLimit: number;
    paymentTerms: string;
    appliedAt: Date;
    reviewedAt: Date | null;
    signatures: Array<{
      signerName: string;
      signerPosition: string | null;
      signatureUrl: string;
      signedAt: Date;
      signatureType: SignatureType;
    }>;
    agreedToTermsAt: Date;
  };
  status: CustomerStatus;
  onboardingComplete: boolean;
}

const STREET_NAMES = [
  'High Street',
  'Station Street',
  'Main Road',
  'Chapel Street',
  'Sydney Road',
  'Victoria Street',
  'Bridge Road',
  'Smith Street',
  'Church Street',
  'King Street',
  'Queen Street',
  'Albert Road',
  'Commercial Road',
  'Clarendon Street',
  'Toorak Road',
  'Burke Road',
  'Lygon Street',
  'Johnston Street',
  'Brunswick Street',
  'Nicholson Street',
];

const DELIVERY_INSTRUCTIONS = [
  'Ring bell on arrival',
  'Delivery at rear of building',
  'Leave with reception',
  'Call before delivery',
  'Use loading dock entrance',
  'Knock loudly - noisy kitchen',
  null,
  null,
  null,
  null, // 60% chance of no special instructions
];

function generateStreetAddress(): string {
  const number = Math.floor(Math.random() * 200) + 1;
  const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  // Sometimes add unit number
  if (Math.random() > 0.7) {
    const unit = Math.floor(Math.random() * 20) + 1;
    return `${unit}/${number} ${street}`;
  }
  return `${number} ${street}`;
}

function generatePhone(): string {
  // Melbourne landline (03) or mobile (04)
  const isMobile = Math.random() > 0.5;
  if (isMobile) {
    return `04${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0')}`;
  }
  return `03${Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0')}`;
}

function generateEmail(firstName: string, lastName: string, businessName: string): string {
  const domain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .substring(0, 15);
  const formats = [
    `${firstName.toLowerCase()}@${domain}.com.au`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com.au`,
    `info@${domain}.com.au`,
    `orders@${domain}.com.au`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}.com.au`,
  ];
  return formats[Math.floor(Math.random() * formats.length)];
}

async function generateCustomer(
  index: number,
  areaMapping: Map<string, { areaId: string; areaName: string }>
): Promise<GeneratedCustomer> {
  const suburb = MELBOURNE_SUBURBS[index % MELBOURNE_SUBURBS.length];
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const businessName = generateBusinessName(suburb.suburb);

  // Account type distribution: 70% company, 20% sole_trader, 10% partnership
  const accountTypeRandom = Math.random();
  const accountType: AccountType =
    accountTypeRandom < 0.7 ? 'company' : accountTypeRandom < 0.9 ? 'sole_trader' : 'partnership';

  // Generate ACN only for companies
  const acn = accountType === 'company' ? generateValidACN() : null;

  // Get area mapping for this suburb
  const areaInfo = areaMapping.get(suburb.suburb.toLowerCase());

  // Credit application: 80% approved, 15% pending, 5% rejected
  const creditStatusRandom = Math.random();
  const creditStatus: CreditApplicationStatus =
    creditStatusRandom < 0.8 ? 'approved' : creditStatusRandom < 0.95 ? 'pending' : 'rejected';

  // Credit limits: $5,000 - $25,000 (stored in cents)
  const creditLimitOptions = [500000, 750000, 1000000, 1500000, 2000000, 2500000]; // in cents
  const creditLimit =
    creditStatus === 'approved'
      ? creditLimitOptions[Math.floor(Math.random() * creditLimitOptions.length)]
      : 0;

  const paymentTermsOptions = ['Net 7', 'Net 14', 'Net 30'];
  const paymentTerms = paymentTermsOptions[Math.floor(Math.random() * paymentTermsOptions.length)];

  const appliedAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000); // Random date in last 6 months
  const reviewedAt = creditStatus !== 'pending' ? new Date(appliedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null;

  // Use different billing address 30% of the time
  const useSameBillingAddress = Math.random() > 0.3;
  const billingSuburb = useSameBillingAddress
    ? suburb
    : MELBOURNE_SUBURBS[Math.floor(Math.random() * MELBOURNE_SUBURBS.length)];

  return {
    clerkUserId: `seed_customer_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`,
    accountType,
    businessName,
    tradingName: generateTradingName(businessName),
    abn: generateValidABN(),
    acn,
    contactPerson: {
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, businessName),
      phone: generatePhone(),
      mobile: Math.random() > 0.3 ? generatePhone() : null,
    },
    deliveryAddress: {
      street: generateStreetAddress(),
      suburb: suburb.suburb,
      state: 'VIC',
      postcode: suburb.postcode,
      country: 'Australia',
      areaId: areaInfo?.areaId || null,
      areaName: areaInfo?.areaName || null,
      latitude: suburb.latitude + (Math.random() - 0.5) * 0.01, // Small random offset
      longitude: suburb.longitude + (Math.random() - 0.5) * 0.01,
      deliveryInstructions: DELIVERY_INSTRUCTIONS[Math.floor(Math.random() * DELIVERY_INSTRUCTIONS.length)],
    },
    billingAddress: {
      street: useSameBillingAddress
        ? generateStreetAddress()
        : STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)],
      suburb: billingSuburb.suburb,
      state: 'VIC',
      postcode: billingSuburb.postcode,
      country: 'Australia',
    },
    creditApplication: {
      status: creditStatus,
      creditLimit,
      paymentTerms,
      appliedAt,
      reviewedAt,
      signatures: [
        {
          signerName: `${firstName} ${lastName}`,
          signerPosition: accountType === 'company' ? 'Director' : 'Owner',
          signatureUrl: 'https://placeholder.joho.com.au/signatures/seed-customer.png',
          signedAt: appliedAt,
          signatureType: 'APPLICANT' as SignatureType,
        },
      ],
      agreedToTermsAt: appliedAt,
    },
    status: CustomerStatus.active,
    onboardingComplete: true,
  };
}

// ============================================================================
// Area Mapping Helper
// ============================================================================

async function loadAreaMappings(): Promise<Map<string, { areaId: string; areaName: string }>> {
  const mappings = await prisma.suburbAreaMapping.findMany({
    where: { isActive: true },
    include: { area: true },
  });

  const map = new Map<string, { areaId: string; areaName: string }>();
  for (const mapping of mappings) {
    if (mapping.area) {
      map.set(mapping.suburb.toLowerCase(), {
        areaId: mapping.areaId!,
        areaName: mapping.area.name,
      });
    }
  }

  return map;
}

// ============================================================================
// Main Script
// ============================================================================

function printUsage(): void {
  console.log(`
Database Seed Script: Create Test Customers

Creates test customers with valid Australian addresses, ABN/ACN numbers,
and realistic business data.

Usage:
  pnpm db:seed-customers --dry-run              Preview customers to be created
  pnpm db:seed-customers --count 20 --confirm   Create 20 customers
  pnpm db:seed-customers --confirm              Create 10 customers (default)

Flags:
  --dry-run     Preview customers without creating them
  --confirm     Execute the seeding (required for safety)
  --count N     Number of customers to create (default: 10)
  --help        Show this help message

Features:
  - Valid ABN generation using official checksum algorithm
  - Valid ACN generation for company accounts
  - Real Melbourne suburbs mapped to delivery areas
  - Mix of business types (restaurants, butchers, cafes, etc.)
  - Varied credit application statuses and limits
`);
}

function printCustomerPreview(customer: GeneratedCustomer, index: number): void {
  console.log(`
  ─────────────────────────────────────────────────────────
  Customer #${index + 1}
  ─────────────────────────────────────────────────────────
  Business:      ${customer.businessName}
  Trading As:    ${customer.tradingName || '(same)'}
  Account Type:  ${customer.accountType}
  ABN:           ${customer.abn}${customer.acn ? `\n  ACN:           ${customer.acn}` : ''}

  Contact:       ${customer.contactPerson.firstName} ${customer.contactPerson.lastName}
  Email:         ${customer.contactPerson.email}
  Phone:         ${customer.contactPerson.phone}

  Delivery:      ${customer.deliveryAddress.street}
                 ${customer.deliveryAddress.suburb}, ${customer.deliveryAddress.state} ${customer.deliveryAddress.postcode}
  Area:          ${customer.deliveryAddress.areaName || '(unassigned)'}

  Credit Status: ${customer.creditApplication.status}
  Credit Limit:  $${(customer.creditApplication.creditLimit / 100).toLocaleString()}
  Payment Terms: ${customer.creditApplication.paymentTerms}
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const isDryRun = args.includes('--dry-run');
  const isConfirmed = args.includes('--confirm');
  const showHelp = args.includes('--help') || args.includes('-h');

  // Parse count argument
  const countIndex = args.indexOf('--count');
  const count = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1], 10) : 10;

  if (isNaN(count) || count < 1 || count > 100) {
    console.error('\n  Error: --count must be a number between 1 and 100\n');
    process.exit(1);
  }

  // Show help if requested or no valid arguments
  if (showHelp || (!isDryRun && !isConfirmed)) {
    printUsage();
    process.exit(showHelp ? 0 : 1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('   DATABASE SEED: Create Test Customers');
  console.log('='.repeat(60));

  try {
    // Connect to database
    console.log('\nConnecting to database...');
    await prisma.$connect();
    console.log('Connected successfully.');

    // Load area mappings
    console.log('\nLoading area mappings...');
    const areaMapping = await loadAreaMappings();
    console.log(`  Found ${areaMapping.size} suburb-to-area mappings`);

    // Check existing customers
    const existingCount = await prisma.customer.count();
    console.log(`  Existing customers in database: ${existingCount}`);

    // Generate customers
    console.log(`\nGenerating ${count} customers...`);
    const customers: GeneratedCustomer[] = [];

    for (let i = 0; i < count; i++) {
      const customer = await generateCustomer(i, areaMapping);

      // Verify ABN is valid
      if (!isValidABN(customer.abn)) {
        console.error(`  Warning: Generated invalid ABN ${customer.abn}, regenerating...`);
        i--; // Retry this index
        continue;
      }

      customers.push(customer);
    }

    // Preview customers
    if (isDryRun) {
      console.log('\n' + '─'.repeat(60));
      console.log('  DRY RUN MODE - No changes will be made');
      console.log('─'.repeat(60));

      for (let i = 0; i < Math.min(customers.length, 3); i++) {
        printCustomerPreview(customers[i], i);
      }

      if (customers.length > 3) {
        console.log(`\n  ... and ${customers.length - 3} more customers`);
      }

      // Summary statistics
      const stats = {
        companies: customers.filter((c) => c.accountType === 'company').length,
        soleTraders: customers.filter((c) => c.accountType === 'sole_trader').length,
        partnerships: customers.filter((c) => c.accountType === 'partnership').length,
        approved: customers.filter((c) => c.creditApplication.status === 'approved').length,
        pending: customers.filter((c) => c.creditApplication.status === 'pending').length,
        rejected: customers.filter((c) => c.creditApplication.status === 'rejected').length,
        withArea: customers.filter((c) => c.deliveryAddress.areaId).length,
      };

      console.log('\n  Summary:');
      console.log(`    Account Types: ${stats.companies} companies, ${stats.soleTraders} sole traders, ${stats.partnerships} partnerships`);
      console.log(`    Credit Status: ${stats.approved} approved, ${stats.pending} pending, ${stats.rejected} rejected`);
      console.log(`    Area Assigned: ${stats.withArea}/${customers.length}`);
      console.log('\n  Run with --confirm to create these customers.\n');

      await prisma.$disconnect();
      process.exit(0);
    }

    // Create customers
    console.log('\n' + '─'.repeat(60));
    console.log('  CREATING CUSTOMERS');
    console.log('─'.repeat(60));

    let created = 0;
    let skipped = 0;

    for (const customer of customers) {
      // Check if ABN already exists
      const existing = await prisma.customer.findFirst({
        where: { abn: customer.abn },
      });

      if (existing) {
        console.log(`  [SKIP] ${customer.businessName} - ABN ${customer.abn} already exists`);
        skipped++;
        continue;
      }

      await prisma.customer.create({
        data: {
          clerkUserId: customer.clerkUserId,
          accountType: customer.accountType,
          businessName: customer.businessName,
          tradingName: customer.tradingName,
          abn: customer.abn,
          acn: customer.acn,
          contactPerson: customer.contactPerson,
          deliveryAddress: customer.deliveryAddress,
          billingAddress: customer.billingAddress,
          creditApplication: customer.creditApplication,
          status: customer.status,
          onboardingComplete: customer.onboardingComplete,
        },
      });

      created++;
      console.log(`  [${created}/${count}] Created: ${customer.businessName}`);
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('   SEEDING COMPLETED');
    console.log('='.repeat(60));
    console.log(`\n  - Created: ${created} customers`);
    console.log(`  - Skipped: ${skipped} (ABN already exists)`);
    console.log(`  - Total customers in database: ${existingCount + created}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('   SEEDING FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`\n  Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n  Stack trace:\n${error.stack}`);
      }
    } else {
      console.error('\n  Unknown error:', error);
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
main();
