import mongoose, { Document, Schema } from 'mongoose';

export interface IScript extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  title: string;
  content: string;
  topic: string;
  duration: number;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  createdAt: Date;
  updatedAt: Date;
}

const ScriptSchema = new Schema<IScript>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'enthusiastic', 'informative'],
    required: true
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
ScriptSchema.index({ userId: 1, createdAt: -1 });

export const Script = mongoose.model<IScript>('Script', ScriptSchema); 