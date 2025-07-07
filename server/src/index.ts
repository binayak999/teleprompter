import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import { userRoutes, videoRoutes, sieveRoutes, scriptRoutes, debugRoutes } from './routes';

// Types are declared globally in ../types/express-fileupload.d.ts

// Type definitions for API responses
interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface SieveResponse {
  id: string;
  status: string;
}

interface SieveJobResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  result?: {
    output_video: {
      url: string;
    };
  };
  error?: string;
}

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for cross-computer communication
  credentials: false // No need for credentials since we're using headers
}));
app.use(express.json());

// Session middleware removed - using header-based user ID instead

// File upload middleware with type assertion
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
}) as any);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Mount routes
app.use('/api/user', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/sieve', sieveRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/debug', debugRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at: http://192.168.1.67:${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});