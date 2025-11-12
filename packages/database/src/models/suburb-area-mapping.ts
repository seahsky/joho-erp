import mongoose, { Schema, Document } from 'mongoose';

export interface ISuburbAreaMapping extends Document {
  suburb: string;
  state: string;
  postcode: string;
  areaTag: 'north' | 'south' | 'east' | 'west';
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SuburbAreaMappingSchema = new Schema<ISuburbAreaMapping>(
  {
    suburb: { type: String, required: true },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    areaTag: {
      type: String,
      enum: ['north', 'south', 'east', 'west'],
      required: true,
    },
    latitude: { type: Number },
    longitude: { type: Number },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
SuburbAreaMappingSchema.index({ suburb: 1, state: 1 }, { unique: true });
SuburbAreaMappingSchema.index({ postcode: 1 });
SuburbAreaMappingSchema.index({ areaTag: 1 });

export const SuburbAreaMapping =
  mongoose.models.SuburbAreaMapping ||
  mongoose.model<ISuburbAreaMapping>('SuburbAreaMapping', SuburbAreaMappingSchema);
