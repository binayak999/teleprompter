import express from 'express';
import { ScriptController } from '../controllers';

const router = express.Router();

// DeepSeek AI integration for script generation (streaming)
router.post('/generate', ScriptController.generateScript);

export default router; 