import { getPrismaClient } from '@joho-erp/database';
import { calculateOrderTotals, generateOrderNumber } from '@joho-erp/shared';

interface OrderItemInput {
  productId: string;
  sku?: string;
  productName?: string;
  unit?: string;
  quantity: number;
  unitPrice: number; // in cents
  applyGst?: boolean;
  gstRate?: number | null;
  parentProductId?: string;
  estimatedLossPercentage?: number;
}

interface CreateTestOrderOptions {
  customerId: string;
  customerName?: string;
  items: OrderItemInput[];
  status?: 'awaiting_approval' | 'confirmed' | 'packing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country?: string;
    areaId?: string;
    areaName?: string;
  };
  requestedDeliveryDate?: Date;
  createdBy?: string;
  internalNotes?: string;
  bypassCreditLimit?: boolean;
  bypassCreditReason?: string;
  bypassCutoffTime?: boolean;
  bypassMinimumOrder?: boolean;
  placedByAdmin?: string;
  placedOnBehalfOf?: string;
}

export async function createTestOrder(options: CreateTestOrderOptions) {
  const prisma = getPrismaClient();

  const items = options.items.map((item, index) => ({
    productId: item.productId,
    parentProductId: item.parentProductId ?? null,
    sku: item.sku ?? `SKU-${index}`,
    productName: item.productName ?? `Product ${index}`,
    unit: item.unit ?? 'kg',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
    applyGst: item.applyGst ?? false,
    gstRate: item.gstRate ?? null,
    estimatedLossPercentage: item.estimatedLossPercentage ?? null,
  }));

  const totals = calculateOrderTotals(
    items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      applyGst: i.applyGst,
      gstRate: i.gstRate,
    }))
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: options.customerId,
      customerName: options.customerName ?? 'Test Customer',
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      deliveryAddress: options.deliveryAddress ?? {
        street: '123 Test Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
      },
      requestedDeliveryDate: options.requestedDeliveryDate ?? tomorrow,
      status: options.status ?? 'confirmed',
      statusHistory: [
        {
          status: options.status ?? 'confirmed',
          changedAt: new Date(),
          changedBy: options.createdBy ?? 'test-user',
          notes: 'Test order created',
        },
      ],
      createdBy: options.createdBy ?? 'test-user',
      internalNotes: options.internalNotes ?? undefined,
      bypassCreditLimit: options.bypassCreditLimit ?? false,
      bypassCreditReason: options.bypassCreditReason ?? undefined,
      bypassCutoffTime: options.bypassCutoffTime ?? false,
      bypassMinimumOrder: options.bypassMinimumOrder ?? false,
      placedByAdmin: options.placedByAdmin ?? undefined,
      placedOnBehalfOf: options.placedOnBehalfOf ?? undefined,
    },
  });
}
