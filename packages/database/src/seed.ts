import { prisma } from './prisma';
import type { AreaTag, ProductUnit, ProductStatus, CustomerStatus, CreditApplicationStatus, InventoryTransactionType, AuditAction, SystemLogLevel, ProofOfDeliveryType } from './generated/prisma';
import { createMoney, multiplyMoney, addMoney, toCents } from '@jimmy-beef/shared';

// Melbourne suburbs with coordinates and area tags
const melbourneSuburbs = [
  // North
  { suburb: 'Preston', postcode: '3072', areaTag: 'north' as AreaTag, latitude: -37.7465, longitude: 145.0034 },
  { suburb: 'Coburg', postcode: '3058', areaTag: 'north' as AreaTag, latitude: -37.7489, longitude: 144.9631 },
  { suburb: 'Brunswick', postcode: '3056', areaTag: 'north' as AreaTag, latitude: -37.7672, longitude: 144.9597 },
  { suburb: 'Northcote', postcode: '3070', areaTag: 'north' as AreaTag, latitude: -37.7706, longitude: 144.9996 },

  // South
  { suburb: 'St Kilda', postcode: '3182', areaTag: 'south' as AreaTag, latitude: -37.8683, longitude: 144.9808 },
  { suburb: 'Brighton', postcode: '3186', areaTag: 'south' as AreaTag, latitude: -37.9121, longitude: 144.9968 },
  { suburb: 'Elwood', postcode: '3184', areaTag: 'south' as AreaTag, latitude: -37.8824, longitude: 144.9868 },

  // East
  { suburb: 'Richmond', postcode: '3121', areaTag: 'east' as AreaTag, latitude: -37.8197, longitude: 144.9983 },
  { suburb: 'Camberwell', postcode: '3124', areaTag: 'east' as AreaTag, latitude: -37.8365, longitude: 145.0737 },
  { suburb: 'Hawthorn', postcode: '3122', areaTag: 'east' as AreaTag, latitude: -37.8226, longitude: 145.0353 },

  // West
  { suburb: 'Footscray', postcode: '3011', areaTag: 'west' as AreaTag, latitude: -37.8004, longitude: 144.9006 },
  { suburb: 'Williamstown', postcode: '3016', areaTag: 'west' as AreaTag, latitude: -37.8648, longitude: 144.8997 },
  { suburb: 'Yarraville', postcode: '3013', areaTag: 'west' as AreaTag, latitude: -37.8153, longitude: 144.8902 },
];

// Beef and Pork products
const products = [
  // Premium Beef Cuts
  {
    sku: 'BEEF-RUMP-5KG',
    name: 'Premium Beef Rump',
    description: 'Premium grass-fed beef rump, aged for 21 days',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 5,
    basePrice: 1850, // $18.50 in cents
    currentStock: 250,
    lowStockThreshold: 50,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-SCOTCH-5KG',
    name: 'Scotch Fillet',
    description: 'Premium scotch fillet, marble score 3+',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 5,
    basePrice: 2400, // $24.00 in cents
    currentStock: 180,
    lowStockThreshold: 40,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-TENDER-3KG',
    name: 'Beef Tenderloin',
    description: 'Premium whole beef tenderloin',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 3,
    basePrice: 3200, // $32.00 in cents
    currentStock: 120,
    lowStockThreshold: 30,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-TBONE-10KG',
    name: 'T-Bone Steak',
    description: 'Premium T-bone steaks, cut to order',
    category: 'Beef - Steaks',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 2200, // $22.00 in cents
    currentStock: 200,
    lowStockThreshold: 50,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-SIRLOIN-8KG',
    name: 'Sirloin Steak',
    description: 'Premium sirloin steaks',
    category: 'Beef - Steaks',
    unit: 'kg' as ProductUnit,
    packageSize: 8,
    basePrice: 1950, // $19.50 in cents
    currentStock: 220,
    lowStockThreshold: 50,
    status: 'active' as ProductStatus,
  },

  // Secondary Beef Cuts
  {
    sku: 'BEEF-BRISKET-10KG',
    name: 'Beef Brisket',
    description: 'Whole beef brisket, perfect for slow cooking',
    category: 'Beef - Secondary Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 1250, // $12.50 in cents
    currentStock: 300,
    lowStockThreshold: 60,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-CHUCK-15KG',
    name: 'Beef Chuck',
    description: 'Premium beef chuck for stewing and braising',
    category: 'Beef - Secondary Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 15,
    basePrice: 1100, // $11.00 in cents
    currentStock: 350,
    lowStockThreshold: 80,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-MINCE-10KG',
    name: 'Premium Beef Mince',
    description: 'Premium lean beef mince (85/15)',
    category: 'Beef - Processed',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 950, // $9.50 in cents
    currentStock: 400,
    lowStockThreshold: 100,
    status: 'active' as ProductStatus,
  },

  // Premium Pork Cuts
  {
    sku: 'PORK-LOIN-8KG',
    name: 'Pork Loin',
    description: 'Premium pork loin, boneless',
    category: 'Pork - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 8,
    basePrice: 1350, // $13.50 in cents
    currentStock: 200,
    lowStockThreshold: 50,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'PORK-BELLY-10KG',
    name: 'Pork Belly',
    description: 'Premium pork belly, skin on',
    category: 'Pork - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 1100, // $11.00 in cents
    currentStock: 250,
    lowStockThreshold: 60,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'PORK-SHOULDER-12KG',
    name: 'Pork Shoulder',
    description: 'Premium pork shoulder, bone-in',
    category: 'Pork - Secondary Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 12,
    basePrice: 950, // $9.50 in cents
    currentStock: 280,
    lowStockThreshold: 70,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'PORK-RIBS-10KG',
    name: 'Pork Spare Ribs',
    description: 'Premium pork spare ribs',
    category: 'Pork - Ribs',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 1200, // $12.00 in cents
    currentStock: 180,
    lowStockThreshold: 40,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'PORK-CHOPS-8KG',
    name: 'Pork Chops',
    description: 'Premium pork loin chops',
    category: 'Pork - Chops',
    unit: 'kg' as ProductUnit,
    packageSize: 8,
    basePrice: 1400, // $14.00 in cents
    currentStock: 160,
    lowStockThreshold: 40,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'PORK-MINCE-10KG',
    name: 'Pork Mince',
    description: 'Premium pork mince',
    category: 'Pork - Processed',
    unit: 'kg' as ProductUnit,
    packageSize: 10,
    basePrice: 850, // $8.50 in cents
    currentStock: 300,
    lowStockThreshold: 80,
    status: 'active' as ProductStatus,
  },

  // Specialty Items
  {
    sku: 'SAUSAGE-BEEF-5KG',
    name: 'Beef Sausages',
    description: 'Premium beef sausages, gluten-free',
    category: 'Processed - Sausages',
    unit: 'kg' as ProductUnit,
    packageSize: 5,
    basePrice: 1000, // $10.00 in cents
    currentStock: 150,
    lowStockThreshold: 30,
    status: 'active' as ProductStatus,
  },

  // Products with Different Units
  {
    sku: 'BEEF-PATTY-BOX',
    name: 'Beef Burger Patties',
    description: 'Premium beef burger patties, 150g each',
    category: 'Processed - Patties',
    unit: 'box' as ProductUnit,
    packageSize: 1,
    basePrice: 4500, // $45.00 in cents (30 patties per box)
    currentStock: 85,
    lowStockThreshold: 20,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'STEAK-PREMIUM-CARTON',
    name: 'Mixed Premium Steaks Carton',
    description: 'Assorted premium steaks in bulk carton',
    category: 'Beef - Premium Cuts',
    unit: 'carton' as ProductUnit,
    packageSize: 1,
    basePrice: 32000, // $320.00 in cents (20kg mixed steaks)
    currentStock: 45,
    lowStockThreshold: 10,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'LAMB-CUTLET-PIECE',
    name: 'Lamb Cutlet (Single Rack)',
    description: 'Premium lamb cutlet rack, French trimmed',
    category: 'Lamb - Premium Cuts',
    unit: 'piece' as ProductUnit,
    packageSize: 1,
    basePrice: 2800, // $28.00 in cents per rack
    currentStock: 120,
    lowStockThreshold: 25,
    status: 'active' as ProductStatus,
  },

  // Discontinued Products
  {
    sku: 'BEEF-OXTAIL-5KG',
    name: 'Beef Oxtail',
    description: 'Premium beef oxtail (DISCONTINUED - supplier issue)',
    category: 'Beef - Specialty',
    unit: 'kg' as ProductUnit,
    packageSize: 5,
    basePrice: 1650, // $16.50 in cents
    currentStock: 25,
    lowStockThreshold: 10,
    status: 'discontinued' as ProductStatus,
  },
  {
    sku: 'PORK-HOCK-8KG',
    name: 'Pork Hock',
    description: 'Pork hocks for braising (DISCONTINUED - low demand)',
    category: 'Pork - Specialty',
    unit: 'kg' as ProductUnit,
    packageSize: 8,
    basePrice: 950, // $9.50 in cents
    currentStock: 15,
    lowStockThreshold: 5,
    status: 'discontinued' as ProductStatus,
  },

  // Out of Stock Products
  {
    sku: 'WAGYU-SIRLOIN-3KG',
    name: 'Wagyu Sirloin A5',
    description: 'Premium Japanese Wagyu sirloin (OUT OF STOCK)',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as ProductUnit,
    packageSize: 3,
    basePrice: 12000, // $120.00 in cents
    currentStock: 0,
    lowStockThreshold: 5,
    status: 'out_of_stock' as ProductStatus,
  },
  {
    sku: 'BEEF-TONGUE-4KG',
    name: 'Beef Tongue',
    description: 'Whole beef tongue (OUT OF STOCK - awaiting delivery)',
    category: 'Beef - Offal',
    unit: 'kg' as ProductUnit,
    packageSize: 4,
    basePrice: 1450, // $14.50 in cents
    currentStock: 0,
    lowStockThreshold: 10,
    status: 'out_of_stock' as ProductStatus,
  },

  // Products at Low Stock Threshold (for alerts testing)
  {
    sku: 'PORK-SAUSAGE-5KG',
    name: 'Pork Sausages',
    description: 'Traditional pork sausages',
    category: 'Processed - Sausages',
    unit: 'kg' as ProductUnit,
    packageSize: 5,
    basePrice: 900, // $9.00 in cents
    currentStock: 30, // Exactly at threshold
    lowStockThreshold: 30,
    status: 'active' as ProductStatus,
  },
  {
    sku: 'BEEF-LIVER-3KG',
    name: 'Beef Liver',
    description: 'Fresh beef liver',
    category: 'Beef - Offal',
    unit: 'kg' as ProductUnit,
    packageSize: 3,
    basePrice: 850, // $8.50 in cents
    currentStock: 18, // Below threshold (20)
    lowStockThreshold: 20,
    status: 'active' as ProductStatus,
  },
];

// Customers - Restaurants, Butchers, Cafes
const customers = [
  {
    clerkUserId: 'user_seed_001',
    businessName: 'The Steakhouse Melbourne',
    abn: '12345678901',
    contactPerson: {
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james@steakhouse.com.au',
      phone: '03 9555 1234',
      mobile: '0412 345 678',
    },
    deliveryAddress: {
      street: '45 Hardware Lane',
      suburb: 'Richmond',
      state: 'VIC',
      postcode: '3121',
      country: 'Australia',
      areaTag: 'east' as AreaTag,
      latitude: -37.8197,
      longitude: 144.9983,
      deliveryInstructions: 'Rear entrance via back alley',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-01-15'),
      reviewedAt: new Date('2025-01-16'),
      creditLimit: 1500000, // $15,000 in cents
      paymentTerms: '30 days',
      notes: 'Long-standing customer, excellent payment history',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_002',
    businessName: 'Brunswick Butcher Shop',
    abn: '23456789012',
    contactPerson: {
      firstName: 'Maria',
      lastName: 'Rossi',
      email: 'maria@brunswickbutcher.com.au',
      phone: '03 9388 5678',
      mobile: '0423 456 789',
    },
    deliveryAddress: {
      street: '128 Sydney Road',
      suburb: 'Brunswick',
      state: 'VIC',
      postcode: '3056',
      country: 'Australia',
      areaTag: 'north' as AreaTag,
      latitude: -37.7672,
      longitude: 144.9597,
      deliveryInstructions: 'Please deliver before 7 AM',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-01-20'),
      reviewedAt: new Date('2025-01-21'),
      creditLimit: 2000000, // $20,000 in cents
      paymentTerms: '14 days',
      notes: 'High volume customer',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_003',
    businessName: 'Footscray Grill House',
    abn: '34567890123',
    contactPerson: {
      firstName: 'David',
      lastName: 'Chen',
      email: 'david@footscraygrill.com.au',
      phone: '03 9687 2345',
      mobile: '0434 567 890',
    },
    deliveryAddress: {
      street: '67 Nicholson Street',
      suburb: 'Footscray',
      state: 'VIC',
      postcode: '3011',
      country: 'Australia',
      areaTag: 'west' as AreaTag,
      latitude: -37.8004,
      longitude: 144.9006,
      deliveryInstructions: 'Loading dock at rear',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-01'),
      reviewedAt: new Date('2025-02-02'),
      creditLimit: 1000000, // $10,000 in cents
      paymentTerms: '30 days',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_004',
    businessName: 'Brighton Beach Bistro',
    abn: '45678901234',
    contactPerson: {
      firstName: 'Sophie',
      lastName: 'Taylor',
      email: 'sophie@brightonbistro.com.au',
      phone: '03 9592 3456',
      mobile: '0445 678 901',
    },
    deliveryAddress: {
      street: '234 Bay Street',
      suburb: 'Brighton',
      state: 'VIC',
      postcode: '3186',
      country: 'Australia',
      areaTag: 'south' as AreaTag,
      latitude: -37.9121,
      longitude: 144.9968,
      deliveryInstructions: 'Ring doorbell, someone always available',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-05'),
      reviewedAt: new Date('2025-02-06'),
      creditLimit: 1200000, // $12,000 in cents
      paymentTerms: '30 days',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_005',
    businessName: 'Camberwell Fine Meats',
    abn: '56789012345',
    contactPerson: {
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael@camberwellmeats.com.au',
      phone: '03 9813 4567',
      mobile: '0456 789 012',
    },
    deliveryAddress: {
      street: '89 Burke Road',
      suburb: 'Camberwell',
      state: 'VIC',
      postcode: '3124',
      country: 'Australia',
      areaTag: 'east' as AreaTag,
      latitude: -37.8365,
      longitude: 145.0737,
      deliveryInstructions: 'Shop front delivery, 6-8 AM preferred',
    },
    creditApplication: {
      status: 'pending' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-10'),
      creditLimit: 0,
      notes: 'New customer, pending credit review',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_006',
    businessName: 'St Kilda Seafood & Grill',
    abn: '67890123456',
    contactPerson: {
      firstName: 'Emma',
      lastName: 'White',
      email: 'emma@stkildagrill.com.au',
      phone: '03 9534 5678',
      mobile: '0467 890 123',
    },
    deliveryAddress: {
      street: '156 Acland Street',
      suburb: 'St Kilda',
      state: 'VIC',
      postcode: '3182',
      country: 'Australia',
      areaTag: 'south' as AreaTag,
      latitude: -37.8683,
      longitude: 144.9808,
      deliveryInstructions: 'Side entrance, call on arrival',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-01-25'),
      reviewedAt: new Date('2025-01-26'),
      creditLimit: 800000, // $8,000 in cents
      paymentTerms: '14 days',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_007',
    businessName: 'Northcote Community Butcher',
    abn: '78901234567',
    contactPerson: {
      firstName: 'Tom',
      lastName: 'Anderson',
      email: 'tom@northcotebutcher.com.au',
      phone: '03 9481 6789',
      mobile: '0478 901 234',
    },
    deliveryAddress: {
      street: '234 High Street',
      suburb: 'Northcote',
      state: 'VIC',
      postcode: '3070',
      country: 'Australia',
      areaTag: 'north' as AreaTag,
      latitude: -37.7706,
      longitude: 144.9996,
      deliveryInstructions: 'Early morning delivery essential',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-01-18'),
      reviewedAt: new Date('2025-01-19'),
      creditLimit: 1800000, // $18,000 in cents
      paymentTerms: '30 days',
    },
    status: 'active' as CustomerStatus,
  },
  {
    clerkUserId: 'user_seed_008',
    businessName: 'Yarraville Pub & Grill',
    abn: '89012345678',
    contactPerson: {
      firstName: 'Lisa',
      lastName: 'Martinez',
      email: 'lisa@yarravillepub.com.au',
      phone: '03 9687 7890',
      mobile: '0489 012 345',
    },
    deliveryAddress: {
      street: '45 Anderson Street',
      suburb: 'Yarraville',
      state: 'VIC',
      postcode: '3013',
      country: 'Australia',
      areaTag: 'west' as AreaTag,
      latitude: -37.8153,
      longitude: 144.8902,
      deliveryInstructions: 'Back entrance via car park',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-03'),
      reviewedAt: new Date('2025-02-04'),
      creditLimit: 900000, // $9,000 in cents
      paymentTerms: '21 days',
    },
    status: 'active' as CustomerStatus,
  },

  // Suspended Customer (payment issues)
  {
    clerkUserId: 'user_seed_009',
    businessName: 'Preston Steakhouse',
    abn: '90123456789',
    contactPerson: {
      firstName: 'Robert',
      lastName: 'Thompson',
      email: 'robert@prestonsteaks.com.au',
      phone: '03 9484 8901',
      mobile: '0490 123 456',
    },
    deliveryAddress: {
      street: '78 High Street',
      suburb: 'Preston',
      state: 'VIC',
      postcode: '3072',
      country: 'Australia',
      areaTag: 'north' as AreaTag,
      latitude: -37.7465,
      longitude: 145.0034,
      deliveryInstructions: 'Delivery during business hours only',
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2024-12-01'),
      reviewedAt: new Date('2024-12-02'),
      creditLimit: 500000, // $5,000 in cents
      paymentTerms: '14 days',
      notes: 'Account suspended due to overdue invoices',
    },
    status: 'suspended' as CustomerStatus,
  },

  // Closed Customer (business ceased trading)
  {
    clerkUserId: 'user_seed_010',
    businessName: 'Coburg Corner Deli',
    abn: '01234567890',
    contactPerson: {
      firstName: 'Angela',
      lastName: 'Morrison',
      email: 'angela@coburgdeli.com.au',
      phone: '03 9354 9012',
      mobile: '0401 234 567',
    },
    deliveryAddress: {
      street: '234 Sydney Road',
      suburb: 'Coburg',
      state: 'VIC',
      postcode: '3058',
      country: 'Australia',
      areaTag: 'north' as AreaTag,
      latitude: -37.7489,
      longitude: 144.9631,
    },
    creditApplication: {
      status: 'approved' as CreditApplicationStatus,
      appliedAt: new Date('2024-10-01'),
      reviewedAt: new Date('2024-10-02'),
      creditLimit: 400000, // $4,000 in cents
      paymentTerms: '30 days',
      notes: 'Account closed - business ceased trading',
    },
    status: 'closed' as CustomerStatus,
  },

  // Rejected Credit Application
  {
    clerkUserId: 'user_seed_011',
    businessName: 'Hawthorn Quick Bites',
    abn: '12345098765',
    contactPerson: {
      firstName: 'Kevin',
      lastName: 'Lee',
      email: 'kevin@hawthornbites.com.au',
      phone: '03 9818 0123',
      mobile: '0412 345 098',
    },
    deliveryAddress: {
      street: '456 Glenferrie Road',
      suburb: 'Hawthorn',
      state: 'VIC',
      postcode: '3122',
      country: 'Australia',
      areaTag: 'east' as AreaTag,
      latitude: -37.8226,
      longitude: 145.0353,
    },
    creditApplication: {
      status: 'rejected' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-08'),
      reviewedAt: new Date('2025-02-09'),
      creditLimit: 0,
      notes: 'Insufficient trading history and references',
    },
    status: 'active' as CustomerStatus,
  },

  // Customer with minimal optional fields
  {
    clerkUserId: 'user_seed_012',
    businessName: 'Elwood Beach Cafe',
    abn: '23456109876',
    contactPerson: {
      firstName: 'Sarah',
      lastName: 'Palmer',
      email: 'sarah@elwoodcafe.com.au',
      phone: '03 9531 1234',
      // No mobile number
    },
    deliveryAddress: {
      street: '89 Ormond Esplanade',
      suburb: 'Elwood',
      state: 'VIC',
      postcode: '3184',
      country: 'Australia',
      areaTag: 'south' as AreaTag,
      latitude: -37.8824,
      longitude: 144.9868,
      // No delivery instructions
    },
    creditApplication: {
      status: 'pending' as CreditApplicationStatus,
      appliedAt: new Date('2025-02-12'),
      creditLimit: 0,
      // No notes, reviewedAt, or reviewedBy
    },
    status: 'active' as CustomerStatus,
  },
];

// Helper function to calculate order totals (all values in cents)
function calculateOrderTotals(items: any[], taxRate: number = 0.1) {
  // Sum all item subtotals (already in cents)
  let subtotalMoney = createMoney(0);
  for (const item of items) {
    subtotalMoney = addMoney(subtotalMoney, createMoney(item.subtotal));
  }

  // Calculate tax using dinero.js for precision
  const taxMultiplier = { amount: Math.round(taxRate * 100), scale: 2 }; // 0.1 = 10/100 = { amount: 10, scale: 2 }
  const taxAmountMoney = multiplyMoney(subtotalMoney, taxMultiplier);
  const totalAmountMoney = addMoney(subtotalMoney, taxAmountMoney);

  return {
    subtotal: toCents(subtotalMoney),
    taxAmount: toCents(taxAmountMoney),
    totalAmount: toCents(totalAmountMoney),
  };
}

// Helper function to generate order number
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `ORD-${year}-${random}`;
}

// Helper function to create random orders
function createOrdersForCustomer(
  customer: any,
  productsList: any[],
  statuses: Array<{
    status: string;
    driverName?: string;
    driverId?: string;
  }>
) {
  return statuses.map((statusInfo) => {
    // Select 2-4 random products
    const numItems = Math.floor(Math.random() * 3) + 2;
    const selectedProducts = [...productsList]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);

    const items = selectedProducts
      .map((product) => {
        // Defensive: Ensure product has valid id
        if (!product.id) {
          console.warn('Seed: Product missing id, skipping:', product.name);
          return null;
        }

        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 packages
        const subtotal = quantity * product.basePrice;
        return {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          unit: product.unit,
          quantity,
          unitPrice: product.basePrice,
          subtotal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totals = calculateOrderTotals(items);
    const orderNumber = generateOrderNumber();

    // Set delivery date based on status
    let requestedDeliveryDate = new Date();
    if (statusInfo.status === 'delivered') {
      requestedDeliveryDate.setDate(requestedDeliveryDate.getDate() - 2);
    } else if (statusInfo.status === 'out_for_delivery') {
      // Today
    } else {
      requestedDeliveryDate.setDate(requestedDeliveryDate.getDate() + 1);
    }

    const order: any = {
      orderNumber,
      customerId: customer.id,
      customerName: customer.businessName,
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      deliveryAddress: customer.deliveryAddress,
      requestedDeliveryDate,
      status: statusInfo.status,
      statusHistory: [
        {
          status: 'pending',
          changedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          changedBy: customer.clerkUserId,
          notes: 'Order created',
        },
        {
          status: 'confirmed',
          changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          changedBy: 'admin_user',
          notes: 'Order confirmed',
        },
      ],
      orderedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: customer.clerkUserId,
    };

    // Add delivery info if applicable
    if (statusInfo.status === 'out_for_delivery' || statusInfo.status === 'delivered') {
      order.delivery = {
        driverId: statusInfo.driverId,
        driverName: statusInfo.driverName,
        assignedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };
      order.statusHistory.push({
        status: statusInfo.status,
        changedAt: new Date(Date.now() - 30 * 60 * 1000),
        changedBy: 'admin_user',
        notes: `Assigned to ${statusInfo.driverName}`,
      });
    }

    if (statusInfo.status === 'delivered') {
      order.delivery.deliveredAt = new Date(Date.now() - 15 * 60 * 1000);
      order.statusHistory.push({
        status: 'delivered',
        changedAt: new Date(Date.now() - 15 * 60 * 1000),
        changedBy: statusInfo.driverId,
        notes: 'Delivery completed',
      });

      // Add proof of delivery for some delivered orders
      if ((statusInfo as any).hasProofOfDelivery) {
        order.delivery.proofOfDelivery = {
          type: 'signature' as ProofOfDeliveryType,
          fileUrl: `https://example.com/pod/${orderNumber}.jpg`,
          uploadedAt: new Date(Date.now() - 10 * 60 * 1000),
        };
      }

      // Add Xero integration data for some delivered orders
      if ((statusInfo as any).hasXero) {
        order.xero = {
          invoiceId: `INV-${Math.floor(Math.random() * 100000)}`,
          invoiceNumber: `${orderNumber}-INV`,
          invoiceStatus: 'paid',
          syncedAt: new Date(Date.now() - 5 * 60 * 1000),
        };
      }
    }

    if (statusInfo.status === 'cancelled') {
      order.statusHistory.push({
        status: 'cancelled',
        changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        changedBy: customer.clerkUserId,
        notes: 'Order cancelled by customer',
      });
    }

    if (statusInfo.status === 'ready_for_delivery') {
      order.statusHistory.push({
        status: 'packing',
        changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        changedBy: 'admin_user',
        notes: 'Order being packed',
      });
      order.statusHistory.push({
        status: 'ready_for_delivery',
        changedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        changedBy: 'admin_user',
        notes: 'Ready for delivery',
      });
      order.packing = {
        packedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        packedBy: 'admin_user',
        notes: 'All items packed and verified',
      };
    }

    return order;
  });
}

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');
    console.log('✅ Connected to database via Prisma\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.order.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.systemLog.deleteMany({});
    await prisma.customerPricing.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.suburbAreaMapping.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Seed Company Settings
    console.log('🏢 Creating company settings...');
    const company = await prisma.company.create({
      data: {
        businessName: 'Premium Meat Suppliers Pty Ltd',
        abn: '98765432101',
        address: {
          street: '123 Wholesale Drive',
          suburb: 'Port Melbourne',
          state: 'VIC',
          postcode: '3207',
          country: 'Australia',
        },
        contactPerson: {
          firstName: 'Operations',
          lastName: 'Manager',
          email: 'orders@premiummeats.com.au',
          phone: '03 9999 0000',
        },
      },
    });
    console.log(`✅ Company created: ${company.businessName}\n`);

    // Seed Suburb Mappings
    console.log('📍 Creating suburb area mappings...');
    const suburbMappings = await Promise.all(
      melbourneSuburbs.map((s) =>
        prisma.suburbAreaMapping.create({
          data: {
            suburb: s.suburb,
            postcode: s.postcode,
            state: 'VIC',
            areaTag: s.areaTag,
          },
        })
      )
    );
    console.log(`✅ Created ${suburbMappings.length} suburb mappings\n`);

    // Seed Products
    console.log('🥩 Creating beef and pork products...');
    const createdProducts = await Promise.all(
      products.map((p) => prisma.product.create({ data: p }))
    );
    console.log(`✅ Created ${createdProducts.length} products:`);
    createdProducts.forEach((p) => {
      console.log(`   - ${p.sku}: ${p.name} ($${(p.basePrice / 100).toFixed(2)}/${p.unit})`);
    });
    console.log('');

    // Seed Inventory Transactions (CRITICAL: Establishes stock audit trail)
    console.log('📦 Creating inventory transactions...');
    const inventoryTransactions = [];

    // Create initial purchase transactions for all products (establishes how current stock was acquired)
    for (const product of createdProducts) {
      // Skip out of stock products (they never had stock to begin with in this scenario)
      if (product.status === 'out_of_stock') continue;

      // Initial purchase transaction (explains current stock)
      inventoryTransactions.push({
        productId: product.id,
        type: 'purchase' as InventoryTransactionType,
        quantity: product.currentStock,
        previousStock: 0,
        newStock: product.currentStock,
        referenceType: 'purchase_order',
        referenceId: product.id, // Using product ID as reference for initial stock
        notes: `Initial stock purchase for ${product.name}`,
        createdBy: 'admin_user',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      });
    }

    // Create some adjustment transactions for discontinued products
    const discontinuedProducts = createdProducts.filter(p => p.status === 'discontinued');
    for (const product of discontinuedProducts) {
      inventoryTransactions.push({
        productId: product.id,
        type: 'adjustment' as InventoryTransactionType,
        quantity: -10,
        previousStock: product.currentStock + 10,
        newStock: product.currentStock,
        notes: `Stock adjustment for ${product.name} - product discontinued`,
        createdBy: 'admin_user',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });
    }

    // Create return transaction example
    const beefRump = createdProducts.find(p => p.sku === 'BEEF-RUMP-5KG');
    if (beefRump) {
      inventoryTransactions.push({
        productId: beefRump.id,
        type: 'return' as InventoryTransactionType,
        quantity: 5,
        previousStock: beefRump.currentStock - 5,
        newStock: beefRump.currentStock,
        notes: 'Customer return - order cancelled',
        createdBy: 'admin_user',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      });
    }

    // Create transfer transaction example
    const porkBelly = createdProducts.find(p => p.sku === 'PORK-BELLY-10KG');
    if (porkBelly) {
      inventoryTransactions.push({
        productId: porkBelly.id,
        type: 'transfer' as InventoryTransactionType,
        quantity: -15,
        previousStock: porkBelly.currentStock + 15,
        newStock: porkBelly.currentStock,
        referenceType: 'warehouse_transfer',
        notes: 'Transfer to warehouse B',
        createdBy: 'admin_user',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      });
    }

    const createdInventoryTransactions = await Promise.all(
      inventoryTransactions.map((t) => prisma.inventoryTransaction.create({ data: t }))
    );
    console.log(`✅ Created ${createdInventoryTransactions.length} inventory transactions:`);
    const transactionsByType = createdInventoryTransactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(transactionsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} transactions`);
    });
    console.log('');

    // Seed Customers
    console.log('👥 Creating customers...');
    const createdCustomers = await Promise.all(
      customers.map((c) => prisma.customer.create({ data: c }))
    );
    console.log(`✅ Created ${createdCustomers.length} customers:`);
    createdCustomers.forEach((c) => {
      console.log(
        `   - ${c.businessName} (${c.deliveryAddress.suburb}, ${c.deliveryAddress.areaTag}) - ${c.creditApplication.status}`
      );
    });
    console.log('');

    // Seed Customer-Specific Pricing
    console.log('💰 Creating customer-specific pricing...');
    const customerPricingData = [];

    // The Steakhouse Melbourne - Premium customer with discounts on premium beef
    const steakhouse = createdCustomers.find((c) => c.businessName === 'The Steakhouse Melbourne');
    if (steakhouse) {
      // Premium cuts at discounted rates
      const beefRump = createdProducts.find((p) => p.sku === 'BEEF-RUMP-5KG');
      const scotchFillet = createdProducts.find((p) => p.sku === 'BEEF-SCOTCH-5KG');
      const tenderloin = createdProducts.find((p) => p.sku === 'BEEF-TENDER-3KG');
      const tbone = createdProducts.find((p) => p.sku === 'BEEF-TBONE-10KG');

      if (beefRump) customerPricingData.push({ customerId: steakhouse.id, productId: beefRump.id, customPrice: 1650 }); // $16.50 ($2 off) in cents
      if (scotchFillet) customerPricingData.push({ customerId: steakhouse.id, productId: scotchFillet.id, customPrice: 2150 }); // $21.50 ($2.50 off) in cents
      if (tenderloin) customerPricingData.push({ customerId: steakhouse.id, productId: tenderloin.id, customPrice: 2900 }); // $29.00 ($3 off) in cents
      if (tbone) customerPricingData.push({ customerId: steakhouse.id, productId: tbone.id, customPrice: 2000 }); // $20.00 ($2 off) in cents
    }

    // Brunswick Butcher Shop - High volume customer with discounts on bulk items
    const brunswickButcher = createdCustomers.find((c) => c.businessName === 'Brunswick Butcher Shop');
    if (brunswickButcher) {
      const brisket = createdProducts.find((p) => p.sku === 'BEEF-BRISKET-10KG');
      const chuck = createdProducts.find((p) => p.sku === 'BEEF-CHUCK-15KG');
      const mince = createdProducts.find((p) => p.sku === 'BEEF-MINCE-10KG');
      const porkShoulder = createdProducts.find((p) => p.sku === 'PORK-SHOULDER-10KG');
      const porkBelly = createdProducts.find((p) => p.sku === 'PORK-BELLY-10KG');

      if (brisket) customerPricingData.push({ customerId: brunswickButcher.id, productId: brisket.id, customPrice: 1100 }); // $11.00 ($1.50 off) in cents
      if (chuck) customerPricingData.push({ customerId: brunswickButcher.id, productId: chuck.id, customPrice: 850 }); // $8.50 ($1.50 off) in cents
      if (mince) customerPricingData.push({ customerId: brunswickButcher.id, productId: mince.id, customPrice: 700 }); // $7.00 ($1 off) in cents
      if (porkShoulder) customerPricingData.push({ customerId: brunswickButcher.id, productId: porkShoulder.id, customPrice: 950 }); // $9.50 ($1.50 off) in cents
      if (porkBelly) customerPricingData.push({ customerId: brunswickButcher.id, productId: porkBelly.id, customPrice: 1350 }); // $13.50 ($1.50 off) in cents
    }

    // Footscray Grill House - Mixed pricing with some discounts
    const footscrayGrill = createdCustomers.find((c) => c.businessName === 'Footscray Grill House');
    if (footscrayGrill) {
      const sirloin = createdProducts.find((p) => p.sku === 'BEEF-SIRLOIN-8KG');
      // const ribs = createdProducts.find((p) => p.sku === 'BEEF-RIBS-12KG'); // Product doesn't exist - commented out
      const sausages = createdProducts.find((p) => p.sku === 'SAUSAGE-BEEF-5KG');

      if (sirloin) customerPricingData.push({ customerId: footscrayGrill.id, productId: sirloin.id, customPrice: 1800 }); // $18.00 ($1.50 off) in cents
      // if (ribs) customerPricingData.push({ customerId: footscrayGrill.id, productId: ribs.id, customPrice: 1250 }); // $12.50 ($1.50 off) in cents
      if (sausages) customerPricingData.push({ customerId: footscrayGrill.id, productId: sausages.id, customPrice: 900 }); // $9.00 ($1 off) in cents
    }

    // Brighton Beach Bistro - Premium customer with special pricing
    const brightonBistro = createdCustomers.find((c) => c.businessName === 'Brighton Beach Bistro');
    if (brightonBistro) {
      const scotchFillet = createdProducts.find((p) => p.sku === 'BEEF-SCOTCH-5KG');
      const tenderloin = createdProducts.find((p) => p.sku === 'BEEF-TENDER-3KG');
      const porkLoin = createdProducts.find((p) => p.sku === 'PORK-LOIN-8KG');

      if (scotchFillet) customerPricingData.push({ customerId: brightonBistro.id, productId: scotchFillet.id, customPrice: 2200 }); // $22.00 ($2 off) in cents
      if (tenderloin) customerPricingData.push({ customerId: brightonBistro.id, productId: tenderloin.id, customPrice: 3000 }); // $30.00 ($2 off) in cents
      if (porkLoin) customerPricingData.push({ customerId: brightonBistro.id, productId: porkLoin.id, customPrice: 1550 }); // $15.50 ($1.50 off) in cents
    }

    // Camberwell Fine Meats - Specialty pricing with time-limited offers
    const camberwellMeats = createdCustomers.find((c) => c.businessName === 'Camberwell Fine Meats');
    if (camberwellMeats) {
      const beefRump = createdProducts.find((p) => p.sku === 'BEEF-RUMP-5KG');
      const tbone = createdProducts.find((p) => p.sku === 'BEEF-TBONE-10KG');
      const porkChops = createdProducts.find((p) => p.sku === 'PORK-CHOPS-8KG');

      // Some with expiration dates (expires in 30 days)
      const futureExpiry = new Date();
      futureExpiry.setDate(futureExpiry.getDate() + 30);

      if (beefRump) customerPricingData.push({
        customerId: camberwellMeats.id,
        productId: beefRump.id,
        customPrice: 1700, // $17.00 ($1.50 off) in cents
        effectiveTo: futureExpiry
      }); // expires in 30 days

      if (tbone) customerPricingData.push({ customerId: camberwellMeats.id, productId: tbone.id, customPrice: 2050 }); // $20.50 ($1.50 off) in cents, no expiry
      if (porkChops) customerPricingData.push({ customerId: camberwellMeats.id, productId: porkChops.id, customPrice: 1200 }); // $12.00 ($1 off) in cents
    }

    // St Kilda Seafood & Grill - Expired pricing (already expired)
    const stkildaGrill = createdCustomers.find((c) => c.businessName === 'St Kilda Seafood & Grill');
    if (stkildaGrill) {
      const beefMince = createdProducts.find((p) => p.sku === 'BEEF-MINCE-10KG');
      const porkMince = createdProducts.find((p) => p.sku === 'PORK-MINCE-10KG');

      const pastExpiry = new Date();
      pastExpiry.setDate(pastExpiry.getDate() - 15); // Expired 15 days ago

      if (beefMince) customerPricingData.push({
        customerId: stkildaGrill.id,
        productId: beefMince.id,
        customPrice: 800, // $8.00 in cents (EXPIRED PRICING)
        effectiveFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Started 60 days ago
        effectiveTo: pastExpiry // Expired 15 days ago
      });

      if (porkMince) customerPricingData.push({
        customerId: stkildaGrill.id,
        productId: porkMince.id,
        customPrice: 750, // $7.50 in cents
        effectiveTo: pastExpiry // Expired 15 days ago
      });
    }

    // Northcote Community Butcher - Future-dated pricing (not yet effective)
    const northcoteButcher = createdCustomers.find((c) => c.businessName === 'Northcote Community Butcher');
    if (northcoteButcher) {
      const scotchFillet = createdProducts.find((p) => p.sku === 'BEEF-SCOTCH-5KG');
      const sirloin = createdProducts.find((p) => p.sku === 'BEEF-SIRLOIN-8KG');

      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 7); // Starts in 7 days

      if (scotchFillet) customerPricingData.push({
        customerId: northcoteButcher.id,
        productId: scotchFillet.id,
        customPrice: 2250, // $22.50 in cents (future pricing)
        effectiveFrom: futureStart, // Starts in 7 days
      });

      if (sirloin) customerPricingData.push({
        customerId: northcoteButcher.id,
        productId: sirloin.id,
        customPrice: 1850, // $18.50 in cents
        effectiveFrom: futureStart, // Starts in 7 days
      });
    }

    const createdPricing = await Promise.all(
      customerPricingData.map((p) => prisma.customerPricing.create({ data: p }))
    );
    console.log(`✅ Created ${createdPricing.length} custom pricing records:`);
    for (const pricing of createdPricing) {
      const customer = createdCustomers.find((c) => c.id === pricing.customerId);
      const product = createdProducts.find((p) => p.id === pricing.productId);
      if (customer && product) {
        const savings = product.basePrice - pricing.customPrice;
        const savingsPercent = ((savings / product.basePrice) * 100).toFixed(1);
        console.log(
          `   - ${customer.businessName} → ${product.name}: $${(pricing.customPrice / 100).toFixed(2)} (save $${(savings / 100).toFixed(2)} / ${savingsPercent}%)`
        );
      }
    }
    console.log('');

    // Seed Orders with different statuses
    console.log('📦 Creating orders...');
    const allOrders = [];

    // Drivers for deliveries
    const drivers = [
      { driverId: 'driver_001', driverName: 'John Smith' },
      { driverId: 'driver_002', driverName: 'Sarah Johnson' },
      { driverId: 'driver_003', driverName: 'Mike Brown' },
      { driverId: 'driver_004', driverName: 'Emma Wilson' },
    ];

    // Create orders for each customer
    for (let i = 0; i < createdCustomers.length; i++) {
      const customer = createdCustomers[i];

      // Skip pending credit customers for now
      if (customer.creditApplication.status !== 'approved') continue;

      const orderStatuses = [];

      // Give each customer 2-4 orders with different statuses
      const numOrders = Math.floor(Math.random() * 3) + 2; // 2-4 orders

      for (let j = 0; j < numOrders; j++) {
        const statusOptions = [
          { status: 'ready_for_delivery' },
          { status: 'out_for_delivery', ...drivers[i % drivers.length] },
          { status: 'delivered', ...drivers[i % drivers.length], hasProofOfDelivery: true, hasXero: true },
          { status: 'confirmed' },
          { status: 'cancelled' },
          { status: 'pending' },
        ];
        orderStatuses.push(statusOptions[j % statusOptions.length]);
      }

      const customerOrders = createOrdersForCustomer(
        customer,
        createdProducts,
        orderStatuses
      );
      allOrders.push(...customerOrders);
    }

    const createdOrders = await Promise.all(
      allOrders.map((o) => prisma.order.create({ data: o }))
    );
    console.log(`✅ Created ${createdOrders.length} orders\n`);

    // Create sale inventory transactions for delivered orders
    console.log('📤 Creating sale inventory transactions for delivered orders...');
    const saleTransactions = [];

    for (const order of createdOrders) {
      // Only create sale transactions for delivered orders
      if (order.status === 'delivered') {
        for (const item of order.items) {
          const product = createdProducts.find(p => p.id === item.productId);
          if (product) {
            saleTransactions.push({
              productId: item.productId,
              type: 'sale' as InventoryTransactionType,
              quantity: -item.quantity,
              previousStock: product.currentStock + item.quantity,
              newStock: product.currentStock,
              referenceType: 'order',
              referenceId: order.id,
              notes: `Sale from order ${order.orderNumber} to ${order.customerName}`,
              createdBy: order.delivery?.driverId || 'admin_user',
              createdAt: order.delivery?.deliveredAt || order.updatedAt,
            });
          }
        }
      }
    }

    const createdSaleTransactions = await Promise.all(
      saleTransactions.map((t) => prisma.inventoryTransaction.create({ data: t }))
    );
    console.log(`✅ Created ${createdSaleTransactions.length} sale transactions for delivered orders\n`);

    // Summary by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      packing: 0,
      ready_for_delivery: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    createdOrders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    });

    console.log('📊 Order Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`   - ${status.replace(/_/g, ' ')}: ${count} orders`);
      }
    });
    console.log('');

    // Seed Audit Logs
    console.log('📝 Creating audit logs...');
    const auditLogs = [];

    // Customer creation logs
    for (const customer of createdCustomers) {
      auditLogs.push({
        userId: customer.clerkUserId,
        action: 'create' as AuditAction,
        entity: 'customer',
        entityId: customer.id,
        changes: {
          businessName: customer.businessName,
          abn: customer.abn,
          status: customer.status,
        },
        metadata: {
          source: 'database_seed',
          creditStatus: customer.creditApplication.status,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seed Script',
        timestamp: customer.createdAt,
      });
    }

    // Order creation and status change logs
    for (const order of createdOrders) {
      // Order creation log
      auditLogs.push({
        userId: order.createdBy,
        action: 'create' as AuditAction,
        entity: 'order',
        entityId: order.id,
        changes: {
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          status: 'pending',
        },
        metadata: {
          source: 'database_seed',
          itemCount: order.items.length,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seed Script',
        timestamp: order.orderedAt,
      });

      // Status change logs for each status transition
      for (const statusChange of order.statusHistory) {
        auditLogs.push({
          userId: statusChange.changedBy,
          action: 'update' as AuditAction,
          entity: 'order',
          entityId: order.id,
          changes: {
            status: statusChange.status,
            previousStatus: order.statusHistory[order.statusHistory.indexOf(statusChange) - 1]?.status || 'pending',
          },
          metadata: {
            source: 'database_seed',
            notes: statusChange.notes,
            orderNumber: order.orderNumber,
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Database Seed Script',
          timestamp: statusChange.changedAt,
        });
      }
    }

    // CustomerPricing creation logs
    for (const pricing of createdPricing) {
      const customer = createdCustomers.find(c => c.id === pricing.customerId);
      const product = createdProducts.find(p => p.id === pricing.productId);

      auditLogs.push({
        userId: customer?.clerkUserId || 'admin_user',
        action: 'create' as AuditAction,
        entity: 'customer_pricing',
        entityId: pricing.id,
        changes: {
          customerId: pricing.customerId,
          productId: pricing.productId,
          customPrice: pricing.customPrice,
          effectiveFrom: pricing.effectiveFrom,
          effectiveTo: pricing.effectiveTo,
        },
        metadata: {
          source: 'database_seed',
          customerName: customer?.businessName,
          productSku: product?.sku,
          basePrice: product?.basePrice,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seed Script',
        timestamp: pricing.createdAt,
      });
    }

    // Product creation logs
    for (const product of createdProducts.slice(0, 5)) { // Sample - first 5 products
      auditLogs.push({
        userId: 'admin_user',
        action: 'create' as AuditAction,
        entity: 'product',
        entityId: product.id,
        changes: {
          sku: product.sku,
          name: product.name,
          basePrice: product.basePrice,
          status: product.status,
        },
        metadata: {
          source: 'database_seed',
          category: product.category,
          unit: product.unit,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seed Script',
        timestamp: product.createdAt,
      });
    }

    const createdAuditLogs = await Promise.all(
      auditLogs.map((log) => prisma.auditLog.create({ data: log }))
    );
    console.log(`✅ Created ${createdAuditLogs.length} audit log entries\n`);

    // Seed System Logs
    console.log('🔧 Creating system logs...');
    const systemLogs = [
      {
        level: 'info' as SystemLogLevel,
        message: 'Application started successfully',
        service: 'main',
        context: { version: '1.0.0', environment: 'development' },
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        level: 'info' as SystemLogLevel,
        message: 'Database connection established',
        service: 'database',
        context: { database: 'mongodb', connectionPool: 'ready' },
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        level: 'info' as SystemLogLevel,
        message: 'Order processing completed',
        service: 'order-service',
        context: { ordersProcessed: 15, duration: '2.3s' },
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        level: 'warn' as SystemLogLevel,
        message: 'Low stock alert triggered',
        service: 'inventory-service',
        context: {
          productSku: 'BEEF-LIVER-3KG',
          currentStock: 18,
          threshold: 20,
        },
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
      {
        level: 'error' as SystemLogLevel,
        message: 'Payment gateway timeout',
        service: 'payment-service',
        context: {
          gateway: 'stripe',
          orderId: 'ORD-2025-123456',
          errorCode: 'GATEWAY_TIMEOUT',
        },
        stack: 'Error: Gateway timeout\n  at PaymentService.process (payment.ts:45)\n  at OrderController.checkout (order.ts:120)',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        level: 'debug' as SystemLogLevel,
        message: 'Cache invalidation triggered',
        service: 'cache-service',
        context: {
          cacheKey: 'products:list',
          reason: 'product_update',
        },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        level: 'info' as SystemLogLevel,
        message: 'Inventory sync completed',
        service: 'inventory-service',
        context: {
          productsUpdated: 25,
          transactionsCreated: 50,
          duration: '1.8s',
        },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        level: 'warn' as SystemLogLevel,
        message: 'API rate limit approaching threshold',
        service: 'api-gateway',
        context: {
          endpoint: '/api/products',
          currentRate: 450,
          limit: 500,
        },
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        level: 'error' as SystemLogLevel,
        message: 'Xero sync failed',
        service: 'integration-service',
        context: {
          integration: 'xero',
          invoiceId: 'INV-12345',
          errorMessage: 'Token expired',
        },
        stack: 'Error: Xero token expired\n  at XeroService.syncInvoice (xero.ts:89)\n  at IntegrationController.sync (integration.ts:45)',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        level: 'debug' as SystemLogLevel,
        message: 'Query performance metrics',
        service: 'database',
        context: {
          query: 'findManyOrders',
          executionTime: '125ms',
          rowsReturned: 48,
        },
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
    ];

    const createdSystemLogs = await Promise.all(
      systemLogs.map((log) => prisma.systemLog.create({ data: log }))
    );
    console.log(`✅ Created ${createdSystemLogs.length} system log entries\n`);

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Company: ${company.businessName}`);
    console.log(`   - Suburb Mappings: ${suburbMappings.length}`);
    console.log(`   - Products: ${createdProducts.length} (active: ${createdProducts.filter(p => p.status === 'active').length}, discontinued: ${createdProducts.filter(p => p.status === 'discontinued').length}, out_of_stock: ${createdProducts.filter(p => p.status === 'out_of_stock').length})`);
    console.log(`   - Customers: ${createdCustomers.length} (active: ${createdCustomers.filter(c => c.status === 'active').length}, suspended: ${createdCustomers.filter(c => c.status === 'suspended').length}, closed: ${createdCustomers.filter(c => c.status === 'closed').length})`);
    console.log(`   - Customer Pricing: ${createdPricing.length}`);
    console.log(`   - Orders: ${createdOrders.length}`);
    console.log(`   - Inventory Transactions: ${createdInventoryTransactions.length + createdSaleTransactions.length} (purchase: ${createdInventoryTransactions.filter(t => t.type === 'purchase').length}, sale: ${createdSaleTransactions.length}, adjustment: ${createdInventoryTransactions.filter(t => t.type === 'adjustment').length}, return: ${createdInventoryTransactions.filter(t => t.type === 'return').length}, transfer: ${createdInventoryTransactions.filter(t => t.type === 'transfer').length})`);
    console.log(`   - Audit Logs: ${createdAuditLogs.length}`);
    console.log(`   - System Logs: ${createdSystemLogs.length}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the seed function
seed();
