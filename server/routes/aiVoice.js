import express from 'express';
import aiVoiceController from '../controllers/aiVoiceController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route: Parse dictation speech transcripts
router.post('/parse', authenticateToken, aiVoiceController.parseVoice);

export default router;
