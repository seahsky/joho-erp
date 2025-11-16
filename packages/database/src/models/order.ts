import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IStatusHistory {
  status: string;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  items: IOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    areaTag: 'north' | 'south' | 'east' | 'west';
    deliveryInstructions?: string;
  };
  requestedDeliveryDate: Date;
  status: 'pending' | 'confirmed' | 'packing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusHistory: IStatusHistory[];
  packing?: {
    packedAt?: Date;
    packedBy?: string;
    notes?: string;
  };
  delivery?: {
    driverId?: string;
    driverName?: string;
    assignedAt?: Date;
    deliveredAt?: Date;
    proofOfDelivery?: {
      type: 'signature' | 'photo';
      fileUrl: string;
      uploadedAt: Date;
    };
    notes?: string;
  };
  internalNotes?: string;
  xero?: {
    invoiceId?: string;
    invoiceNumber?: string;
    invoiceStatus?: string;
    syncedAt?: Date;
    syncError?: string;
  };
  orderedAt: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: { type: String, required: true },
        productName: { type: String, required: true },
        unit: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    deliveryAddress: {
      street: { type: String, required: true },
      suburb: { type: String, required: true },
      state: { type: String, required: true },
      postcode: { type: String, required: true },
      areaTag: {
        type: String,
        enum: ['north', 'south', 'east', 'west'],
        required: true,
      },
      deliveryInstructions: { type: String },
    },
    requestedDeliveryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'],
      required: true,
      default: 'pending',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        changedBy: { type: String, required: true },
        notes: { type: String },
      },
    ],
    packing: {
      packedAt: { type: Date },
      packedBy: { type: String },
      notes: { type: String },
    },
    delivery: {
      driverId: { type: String },
      driverName: { type: String },
      assignedAt: { type: Date },
      deliveredAt: { type: Date },
      proofOfDelivery: {
        type: {
          type: String,
          enum: ['signature', 'photo'],
        },
        fileUrl: { type: String },
        uploadedAt: { type: Date },
      },
      notes: { type: String },
    },
    internalNotes: { type: String },
    xero: {
      invoiceId: { type: String },
      invoiceNumber: { type: String },
      invoiceStatus: { type: String },
      syncedAt: { type: Date },
      syncError: { type: String },
    },
    orderedAt: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customerId: 1, orderedAt: -1 });
OrderSchema.index({ status: 1, requestedDeliveryDate: 1 });
OrderSchema.index({ 'deliveryAddress.areaTag': 1, requestedDeliveryDate: 1 });
OrderSchema.index({ requestedDeliveryDate: 1, status: 1 });
// Delivery-specific indexes
OrderSchema.index({ 'delivery.driverId': 1 });
OrderSchema.index({ 'delivery.deliveredAt': -1 });
OrderSchema.index({ status: 1, 'deliveryAddress.areaTag': 1, requestedDeliveryDate: 1 });
// General date queries
OrderSchema.index({ orderedAt: -1 });

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
