import express from 'express';
import { SieveController } from '../controllers';

const router = express.Router();

// Send video to SIEVE for eye correction
router.post('/send-to-sieve/:videoId', SieveController.sendToSieve);

// Sieve eye correction integration (legacy endpoint - use /send-to-sieve/:videoId instead)
router.post('/correct-eyes', SieveController.correctEyes);

// Check Sieve job status
router.get('/check-job/:jobId', SieveController.checkJobStatus);

export default router; 