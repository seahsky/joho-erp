import { getPrismaClient } from '@joho-erp/database';

interface CreateTestProductOptions {
  sku?: string;
  name?: string;
  description?: string;
  category?: 'Beef' | 'Pork' | 'Chicken' | 'Lamb' | 'Processed';
  categoryId?: string;
  unit?: 'kg' | 'piece' | 'box' | 'carton';
  packageSize?: number;
  basePrice?: number; // in cents
  applyGst?: boolean;
  gstRate?: number;
  currentStock?: number;
  lowStockThreshold?: number;
  status?: 'active' | 'discontinued' | 'out_of_stock';
  imageUrl?: string;
  parentProductId?: string;
  estimatedLossPercentage?: number;
}

let productCounter = 0;

export async function createTestProduct(options: CreateTestProductOptions = {}) {
  const prisma = getPrismaClient();
  productCounter++;

  return prisma.product.create({
    data: {
      sku: options.sku ?? `TEST-SKU-${productCounter}-${Date.now()}`,
      name: options.name ?? `Test Product ${productCounter}`,
      description: options.description ?? 'Test product description',
      category: options.category ?? 'Beef',
      categoryId: options.categoryId ?? undefined,
      unit: options.unit ?? 'kg',
      packageSize: options.packageSize ?? 1,
      basePrice: options.basePrice ?? 1850, // $18.50
      applyGst: options.applyGst ?? false,
      gstRate: options.gstRate ?? null,
      currentStock: options.currentStock ?? 100,
      lowStockThreshold: options.lowStockThreshold ?? 10,
      status: options.status ?? 'active',
      imageUrl: options.imageUrl ?? null,
      parentProductId: options.parentProductId ?? undefined,
      estimatedLossPercentage: options.estimatedLossPercentage ?? null,
    },
  });
}

interface BatchOptions {
  supplierId?: string;
  quantity: number;
  costPerUnit: number; // in cents
  expiryDate?: Date;
}

export async function createTestProductWithBatches(
  productOptions: CreateTestProductOptions = {},
  batches: BatchOptions[] = []
) {
  const prisma = getPrismaClient();
  const product = await createTestProduct(productOptions);

  const createdBatches = [];
  for (const batch of batches) {
    const inventoryBatch = await prisma.inventoryBatch.create({
      data: {
        productId: product.id,
        supplierId: batch.supplierId,
        initialQuantity: batch.quantity,
        quantityRemaining: batch.quantity,
        costPerUnit: batch.costPerUnit,
        receivedAt: new Date(),
        expiryDate: batch.expiryDate ?? null,
      },
    });
    createdBatches.push(inventoryBatch);
  }

  return { product, batches: createdBatches };
}
