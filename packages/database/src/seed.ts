import { connectDB } from './connection';
import { Product, Customer, Order, Company, SuburbAreaMapping } from './index';

// Melbourne suburbs with coordinates and area tags
const melbourneSuburbs = [
  // North
  { suburb: 'Preston', postcode: '3072', areaTag: 'north', latitude: -37.7465, longitude: 145.0034 },
  { suburb: 'Coburg', postcode: '3058', areaTag: 'north', latitude: -37.7489, longitude: 144.9631 },
  { suburb: 'Brunswick', postcode: '3056', areaTag: 'north', latitude: -37.7672, longitude: 144.9597 },
  { suburb: 'Northcote', postcode: '3070', areaTag: 'north', latitude: -37.7706, longitude: 144.9996 },

  // South
  { suburb: 'St Kilda', postcode: '3182', areaTag: 'south', latitude: -37.8683, longitude: 144.9808 },
  { suburb: 'Brighton', postcode: '3186', areaTag: 'south', latitude: -37.9121, longitude: 144.9968 },
  { suburb: 'Elwood', postcode: '3184', areaTag: 'south', latitude: -37.8824, longitude: 144.9868 },

  // East
  { suburb: 'Richmond', postcode: '3121', areaTag: 'east', latitude: -37.8197, longitude: 144.9983 },
  { suburb: 'Camberwell', postcode: '3124', areaTag: 'east', latitude: -37.8365, longitude: 145.0737 },
  { suburb: 'Hawthorn', postcode: '3122', areaTag: 'east', latitude: -37.8226, longitude: 145.0353 },

  // West
  { suburb: 'Footscray', postcode: '3011', areaTag: 'west', latitude: -37.8004, longitude: 144.9006 },
  { suburb: 'Williamstown', postcode: '3016', areaTag: 'west', latitude: -37.8648, longitude: 144.8997 },
  { suburb: 'Yarraville', postcode: '3013', areaTag: 'west', latitude: -37.8153, longitude: 144.8902 },
];

// Beef and Pork products
const products = [
  // Premium Beef Cuts
  {
    sku: 'BEEF-RUMP-5KG',
    name: 'Premium Beef Rump',
    description: 'Premium grass-fed beef rump, aged for 21 days',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as const,
    packageSize: 5,
    basePrice: 18.50,
    currentStock: 250,
    lowStockThreshold: 50,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-SCOTCH-5KG',
    name: 'Scotch Fillet',
    description: 'Premium scotch fillet, marble score 3+',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as const,
    packageSize: 5,
    basePrice: 24.00,
    currentStock: 180,
    lowStockThreshold: 40,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-TENDER-3KG',
    name: 'Beef Tenderloin',
    description: 'Premium whole beef tenderloin',
    category: 'Beef - Premium Cuts',
    unit: 'kg' as const,
    packageSize: 3,
    basePrice: 32.00,
    currentStock: 120,
    lowStockThreshold: 30,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-TBONE-10KG',
    name: 'T-Bone Steak',
    description: 'Premium T-bone steaks, cut to order',
    category: 'Beef - Steaks',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 22.00,
    currentStock: 200,
    lowStockThreshold: 50,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-SIRLOIN-8KG',
    name: 'Sirloin Steak',
    description: 'Premium sirloin steaks',
    category: 'Beef - Steaks',
    unit: 'kg' as const,
    packageSize: 8,
    basePrice: 19.50,
    currentStock: 220,
    lowStockThreshold: 50,
    status: 'active' as const,
  },

  // Secondary Beef Cuts
  {
    sku: 'BEEF-BRISKET-10KG',
    name: 'Beef Brisket',
    description: 'Whole beef brisket, perfect for slow cooking',
    category: 'Beef - Secondary Cuts',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 12.50,
    currentStock: 300,
    lowStockThreshold: 60,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-CHUCK-15KG',
    name: 'Beef Chuck',
    description: 'Premium beef chuck for stewing and braising',
    category: 'Beef - Secondary Cuts',
    unit: 'kg' as const,
    packageSize: 15,
    basePrice: 11.00,
    currentStock: 350,
    lowStockThreshold: 80,
    status: 'active' as const,
  },
  {
    sku: 'BEEF-MINCE-10KG',
    name: 'Premium Beef Mince',
    description: 'Premium lean beef mince (85/15)',
    category: 'Beef - Processed',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 9.50,
    currentStock: 400,
    lowStockThreshold: 100,
    status: 'active' as const,
  },

  // Premium Pork Cuts
  {
    sku: 'PORK-LOIN-8KG',
    name: 'Pork Loin',
    description: 'Premium pork loin, boneless',
    category: 'Pork - Premium Cuts',
    unit: 'kg' as const,
    packageSize: 8,
    basePrice: 13.50,
    currentStock: 200,
    lowStockThreshold: 50,
    status: 'active' as const,
  },
  {
    sku: 'PORK-BELLY-10KG',
    name: 'Pork Belly',
    description: 'Premium pork belly, skin on',
    category: 'Pork - Premium Cuts',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 11.00,
    currentStock: 250,
    lowStockThreshold: 60,
    status: 'active' as const,
  },
  {
    sku: 'PORK-SHOULDER-12KG',
    name: 'Pork Shoulder',
    description: 'Premium pork shoulder, bone-in',
    category: 'Pork - Secondary Cuts',
    unit: 'kg' as const,
    packageSize: 12,
    basePrice: 9.50,
    currentStock: 280,
    lowStockThreshold: 70,
    status: 'active' as const,
  },
  {
    sku: 'PORK-RIBS-10KG',
    name: 'Pork Spare Ribs',
    description: 'Premium pork spare ribs',
    category: 'Pork - Ribs',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 12.00,
    currentStock: 180,
    lowStockThreshold: 40,
    status: 'active' as const,
  },
  {
    sku: 'PORK-CHOPS-8KG',
    name: 'Pork Chops',
    description: 'Premium pork loin chops',
    category: 'Pork - Chops',
    unit: 'kg' as const,
    packageSize: 8,
    basePrice: 14.00,
    currentStock: 160,
    lowStockThreshold: 40,
    status: 'active' as const,
  },
  {
    sku: 'PORK-MINCE-10KG',
    name: 'Pork Mince',
    description: 'Premium pork mince',
    category: 'Pork - Processed',
    unit: 'kg' as const,
    packageSize: 10,
    basePrice: 8.50,
    currentStock: 300,
    lowStockThreshold: 80,
    status: 'active' as const,
  },

  // Specialty Items
  {
    sku: 'SAUSAGE-BEEF-5KG',
    name: 'Beef Sausages',
    description: 'Premium beef sausages, gluten-free',
    category: 'Processed - Sausages',
    unit: 'kg' as const,
    packageSize: 5,
    basePrice: 10.00,
    currentStock: 150,
    lowStockThreshold: 30,
    status: 'active' as const,
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
      areaTag: 'east' as const,
      latitude: -37.8197,
      longitude: 144.9983,
      deliveryInstructions: 'Rear entrance via back alley',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-01-15'),
      reviewedAt: new Date('2025-01-16'),
      creditLimit: 15000,
      paymentTerms: '30 days',
      notes: 'Long-standing customer, excellent payment history',
    },
    status: 'active' as const,
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
      areaTag: 'north' as const,
      latitude: -37.7672,
      longitude: 144.9597,
      deliveryInstructions: 'Please deliver before 7 AM',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-01-20'),
      reviewedAt: new Date('2025-01-21'),
      creditLimit: 20000,
      paymentTerms: '14 days',
      notes: 'High volume customer',
    },
    status: 'active' as const,
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
      areaTag: 'west' as const,
      latitude: -37.8004,
      longitude: 144.9006,
      deliveryInstructions: 'Loading dock at rear',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-02-01'),
      reviewedAt: new Date('2025-02-02'),
      creditLimit: 10000,
      paymentTerms: '30 days',
    },
    status: 'active' as const,
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
      areaTag: 'south' as const,
      latitude: -37.9121,
      longitude: 144.9968,
      deliveryInstructions: 'Ring doorbell, someone always available',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-02-05'),
      reviewedAt: new Date('2025-02-06'),
      creditLimit: 12000,
      paymentTerms: '30 days',
    },
    status: 'active' as const,
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
      areaTag: 'east' as const,
      latitude: -37.8365,
      longitude: 145.0737,
      deliveryInstructions: 'Shop front delivery, 6-8 AM preferred',
    },
    creditApplication: {
      status: 'pending' as const,
      appliedAt: new Date('2025-02-10'),
      creditLimit: 0,
      notes: 'New customer, pending credit review',
    },
    status: 'active' as const,
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
      areaTag: 'south' as const,
      latitude: -37.8683,
      longitude: 144.9808,
      deliveryInstructions: 'Side entrance, call on arrival',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-01-25'),
      reviewedAt: new Date('2025-01-26'),
      creditLimit: 8000,
      paymentTerms: '14 days',
    },
    status: 'active' as const,
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
      areaTag: 'north' as const,
      latitude: -37.7706,
      longitude: 144.9996,
      deliveryInstructions: 'Early morning delivery essential',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-01-18'),
      reviewedAt: new Date('2025-01-19'),
      creditLimit: 18000,
      paymentTerms: '30 days',
    },
    status: 'active' as const,
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
      areaTag: 'west' as const,
      latitude: -37.8153,
      longitude: 144.8902,
      deliveryInstructions: 'Back entrance via car park',
    },
    creditApplication: {
      status: 'approved' as const,
      appliedAt: new Date('2025-02-03'),
      reviewedAt: new Date('2025-02-04'),
      creditLimit: 9000,
      paymentTerms: '21 days',
    },
    status: 'active' as const,
  },
];

// Helper function to calculate order totals
function calculateOrderTotals(items: any[], taxRate: number = 0.1) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
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
        productId: product._id,
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
      customerId: customer._id,
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

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      Company.deleteMany({}),
      SuburbAreaMapping.deleteMany({}),
    ]);
    console.log('✅ Existing data cleared\n');

    // Seed Company Settings
    console.log('🏢 Creating company settings...');
    const company = await Company.create({
      name: 'Premium Meat Suppliers Pty Ltd',
      abn: '98765432101',
      address: {
        street: '123 Wholesale Drive',
        suburb: 'Port Melbourne',
        state: 'VIC',
        postcode: '3207',
        country: 'Australia',
      },
      contact: {
        phone: '03 9999 0000',
        email: 'orders@premiummeats.com.au',
        website: 'www.premiummeats.com.au',
      },
      orderSettings: {
        cutoffTime: '14:00',
        timezone: 'Australia/Melbourne',
        minimumOrderValue: 100,
        deliveryFee: 15,
        freeDeliveryThreshold: 500,
      },
      deliveryAreas: [
        { area: 'north', name: 'Northern Suburbs' },
        { area: 'south', name: 'Southern Suburbs' },
        { area: 'east', name: 'Eastern Suburbs' },
        { area: 'west', name: 'Western Suburbs' },
      ],
      taxRate: 0.1,
    });
    console.log(`✅ Company created: ${company.name}\n`);

    // Seed Suburb Mappings
    console.log('📍 Creating suburb area mappings...');
    const suburbMappings = await SuburbAreaMapping.insertMany(
      melbourneSuburbs.map((s) => ({
        suburb: s.suburb,
        postcode: s.postcode,
        state: 'VIC',
        areaTag: s.areaTag,
        coordinates: {
          latitude: s.latitude,
          longitude: s.longitude,
        },
      }))
    );
    console.log(`✅ Created ${suburbMappings.length} suburb mappings\n`);

    // Seed Products
    console.log('🥩 Creating beef and pork products...');
    const createdProducts = await Product.insertMany(products);
    console.log(`✅ Created ${createdProducts.length} products:`);
    createdProducts.forEach((p) => {
      console.log(`   - ${p.sku}: ${p.name} ($${p.basePrice}/${p.unit})`);
    });
    console.log('');

    // Seed Customers
    console.log('👥 Creating customers...');
    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${createdCustomers.length} customers:`);
    createdCustomers.forEach((c) => {
      console.log(
        `   - ${c.businessName} (${c.deliveryAddress.suburb}, ${c.deliveryAddress.areaTag}) - ${c.creditApplication.status}`
      );
    });
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

    const createdOrders = await Order.insertMany(allOrders);
    console.log(`✅ Created ${createdOrders.length} orders\n`);

    // Summary by status
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      packing: 0,
      ready_for_delivery: 0,
      out_for_delivery: 0,
      delivered: 0,
    };

    createdOrders.forEach((o) => {
      statusCounts[o.status as keyof typeof statusCounts]++;
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
    console.log(`   - Orders: ${createdOrders.length}`);
    console.log(`   - Suburb Mappings: ${suburbMappings.length}`);
    console.log(`   - Company: ${company.name}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
