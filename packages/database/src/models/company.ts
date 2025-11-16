import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  businessName: string;
  abn: string;
  email: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  orderCutoffTime: string;
  timezone: string;
  deliveryAreas: {
    name: string;
    description?: string;
    suburbs: string[];
  }[];
  xero: {
    enabled: boolean;
    tenantId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    lastSyncAt?: Date;
  };
  settings: {
    defaultCurrency: string;
    taxRate: number;
    lowStockThreshold: number;
    enableEmailNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    businessName: { type: String, required: true },
    abn: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      suburb: { type: String, required: true },
      state: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, required: true, default: 'Australia' },
    },
    orderCutoffTime: { type: String, required: true, default: '14:00' },
    timezone: { type: String, required: true, default: 'Australia/Sydney' },
    deliveryAreas: [
      {
        name: { type: String, required: true },
        description: { type: String },
        suburbs: [{ type: String }],
      },
    ],
    xero: {
      enabled: { type: Boolean, default: false },
      tenantId: { type: String },
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
      lastSyncAt: { type: Date },
    },
    settings: {
      defaultCurrency: { type: String, default: 'AUD' },
      taxRate: { type: Number, default: 0.1 },
      lowStockThreshold: { type: Number, default: 10 },
      enableEmailNotifications: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompanySchema.index({ businessName: 1 });

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
