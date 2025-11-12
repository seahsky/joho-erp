import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: 'kg' | 'piece' | 'box' | 'carton';
  packageSize?: number;
  basePrice: number;
  currentStock: number;
  lowStockThreshold?: number;
  status: 'active' | 'discontinued' | 'out_of_stock';
  xeroItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    unit: {
      type: String,
      enum: ['kg', 'piece', 'box', 'carton'],
      required: true,
    },
    packageSize: { type: Number },
    basePrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['active', 'discontinued', 'out_of_stock'],
      required: true,
      default: 'active',
    },
    xeroItemId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
