import { prisma } from './prisma';
import type { AreaTag, ProductUnit, ProductStatus, CustomerStatus, CreditApplicationStatus } from './generated/prisma';
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

    const items = selectedProducts.map((product) => {
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
    });

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

      // Give each customer 2-3 orders with different statuses
      const numOrders = Math.floor(Math.random() * 2) + 2; // 2-3 orders

      for (let j = 0; j < numOrders; j++) {
        const statusOptions = [
          { status: 'ready_for_delivery' },
          { status: 'out_for_delivery', ...drivers[i % drivers.length] },
          { status: 'delivered', ...drivers[i % drivers.length] },
          { status: 'confirmed' },
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

    // Summary by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      packing: 0,
      ready_for_delivery: 0,
      out_for_delivery: 0,
      delivered: 0,
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

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Products: ${createdProducts.length}`);
    console.log(`   - Customers: ${createdCustomers.length}`);
    console.log(`   - Customer Pricing: ${createdPricing.length}`);
    console.log(`   - Orders: ${createdOrders.length}`);
    console.log(`   - Suburb Mappings: ${suburbMappings.length}`);
    console.log(`   - Company: ${company.businessName}\n`);

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
