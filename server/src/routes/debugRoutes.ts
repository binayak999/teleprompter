import express from 'express';
import { DebugController } from '../controllers';

const router = express.Router();

// Debug endpoint to check session
router.get('/session', DebugController.getSession);

// Health check
router.get('/health', DebugController.healthCheck);

export default router; 