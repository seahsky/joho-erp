import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  clerkUserId: string;
  businessName: string;
  abn: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile?: string;
  };
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
    areaTag: 'north' | 'south' | 'east' | 'west';
    latitude?: number;
    longitude?: number;
    deliveryInstructions?: string;
  };
  billingAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  creditApplication: {
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    creditLimit: number;
    paymentTerms?: string;
    notes?: string;
  };
  status: 'active' | 'suspended' | 'closed';
  xeroContactId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    clerkUserId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    abn: { type: String, required: true },
    contactPerson: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      mobile: { type: String },
    },
    deliveryAddress: {
      street: { type: String, required: true },
      suburb: { type: String, required: true },
      state: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, required: true, default: 'Australia' },
      areaTag: {
        type: String,
        enum: ['north', 'south', 'east', 'west'],
        required: true,
      },
      latitude: { type: Number },
      longitude: { type: Number },
      deliveryInstructions: { type: String },
    },
    billingAddress: {
      street: { type: String },
      suburb: { type: String },
      state: { type: String },
      postcode: { type: String },
      country: { type: String, default: 'Australia' },
    },
    creditApplication: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true,
        default: 'pending',
      },
      appliedAt: { type: Date, required: true, default: Date.now },
      reviewedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      creditLimit: { type: Number, required: true, default: 0 },
      paymentTerms: { type: String },
      notes: { type: String },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed'],
      required: true,
      default: 'active',
    },
    xeroContactId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
CustomerSchema.index({ clerkUserId: 1 }, { unique: true });
CustomerSchema.index({ 'contactPerson.email': 1 });
CustomerSchema.index({ 'deliveryAddress.areaTag': 1 });
CustomerSchema.index({ 'creditApplication.status': 1 });
CustomerSchema.index({ status: 1 });

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
