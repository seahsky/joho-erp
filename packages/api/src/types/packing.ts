/**
 * Packing Interface Type Definitions
 * Types for the order packing module
 */

export interface PackingSessionSummary {
  deliveryDate: Date;
  orders: PackingOrder[];
  productSummary: ProductSummaryItem[];
}

export interface PackingOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  areaTag: string;
}

export interface ProductSummaryItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  orders: {
    orderNumber: string;
    quantity: number;
  }[];
}

export interface PackingOrderCard {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  areaTag: string;
  items: PackingOrderItem[];
  status: 'confirmed' | 'packing' | 'ready_for_delivery';
  allItemsPacked: boolean;
  packingNotes?: string;
}

export interface PackingOrderItem {
  sku: string;
  productName: string;
  quantity: number;
  packed: boolean;
}
