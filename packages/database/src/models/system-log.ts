import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  context?: Record<string, any>;
  stackTrace?: string;
  timestamp: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
  {
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      required: true,
    },
    service: { type: String, required: true },
    message: { type: String, required: true },
    context: { type: Schema.Types.Mixed },
    stackTrace: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Indexes
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ service: 1, timestamp: -1 });
SystemLogSchema.index({ timestamp: -1 });

export const SystemLog = mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
