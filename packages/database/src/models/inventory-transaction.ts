import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryTransaction extends Document {
  productId: mongoose.Types.ObjectId;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: 'order' | 'manual';
  referenceId?: mongoose.Types.ObjectId;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  createdAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return', 'damage'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceType: { type: String, enum: ['order', 'manual'] },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String },
    performedBy: { type: String, required: true },
    performedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes
InventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ referenceId: 1, referenceType: 1 });
InventoryTransactionSchema.index({ type: 1 });

export const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
