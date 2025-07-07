import express from 'express';
import { VideoController } from '../controllers';

const router = express.Router();

// Get user's videos
router.get('/', VideoController.getUserVideos);

// Delete video
router.delete('/:videoId', VideoController.deleteVideo);

// Save recorded video
router.post('/save', VideoController.saveVideo);

export default router; 