import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import session from 'express-session';
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
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});