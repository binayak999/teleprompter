import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  userId: string;
  filename: string;
  originalName: string;
  filepath: string;
  url: string;
  size: number;
  mimetype: string;
  duration?: number;
  scriptId?: mongoose.Types.ObjectId;
  sieveJobId?: string;
  correctedVideoUrl?: string;
  sieveStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  scriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script',
    default: null
  },
  sieveJobId: {
    type: String,
    default: null
  },
  correctedVideoUrl: {
    type: String,
    default: null
  },
  sieveStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
VideoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Video = mongoose.model<IVideo>('Video', VideoSchema); 