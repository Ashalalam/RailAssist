import express from 'express';
import aiChatController from '../controllers/aiChatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route: Handle copilot query chat requests with RAG data injection
router.post('/query', authenticateToken, aiChatController.handleChat);

export default router;
