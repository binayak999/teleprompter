import express from 'express';
import { ScriptController } from '../controllers';

const router = express.Router();

// Script generation and management
router.post('/generate', ScriptController.generateScript);
router.get('/', ScriptController.getUserScripts);
router.get('/:scriptId', ScriptController.getScriptById);
router.delete('/:scriptId', ScriptController.deleteScript);

export default router; 