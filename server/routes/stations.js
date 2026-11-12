import express from 'express';
import stationController from '../controllers/stationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public/authenticated routes
router.get('/', authenticateToken, stationController.getStations);
router.get('/search', authenticateToken, stationController.searchStations);
router.get('/:code', authenticateToken, stationController.getStationByCode);
router.post('/sync', authenticateToken, stationController.syncStations);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, stationController.createStation);
router.put('/:code', authenticateToken, requireAdmin, stationController.updateStation);
router.delete('/:code', authenticateToken, requireAdmin, stationController.deleteStation);

export default router;
