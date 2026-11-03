import express from 'express';
import upload from '../middleware/upload.js';
import aiOcrController from '../controllers/aiOcrController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route: Upload slip for background OCR queue processing
router.post('/upload', authenticateToken, upload.single('file'), aiOcrController.enqueueOCR);

// Route: Poll status of enqueued OCR jobs
router.get('/status/:jobId', authenticateToken, aiOcrController.checkStatus);

export default router;
