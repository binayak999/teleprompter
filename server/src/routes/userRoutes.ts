import express from 'express';
import { UserController } from '../controllers';

const router = express.Router();

// Get or create user
router.get('/', UserController.getOrCreateUser);

export default router; 