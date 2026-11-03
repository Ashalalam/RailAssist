import express from 'express';
import aiAuditController from '../controllers/aiAuditController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route: Run deterministic checks and AI summaries on monthly logs
router.get('/validate', authenticateToken, aiAuditController.runAudit);

export default router;
