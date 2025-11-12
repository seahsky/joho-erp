import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerPricing extends Document {
  customerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  unitPrice: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerPricingSchema = new Schema<ICustomerPricing>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
CustomerPricingSchema.index({ customerId: 1, productId: 1 }, { unique: true });
CustomerPricingSchema.index({ productId: 1 });
CustomerPricingSchema.index({ effectiveTo: 1 });

export const CustomerPricing =
  mongoose.models.CustomerPricing || mongoose.model<ICustomerPricing>('CustomerPricing', CustomerPricingSchema);
