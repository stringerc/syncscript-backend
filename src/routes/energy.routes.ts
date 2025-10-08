import { Router } from 'express';
import { EnergyController } from '../controllers/energy.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All energy routes require authentication
router.post('/energy', requireAuth, EnergyController.logEnergy);
router.get('/energy', requireAuth, EnergyController.getEnergyLogs);
router.get('/energy/latest', requireAuth, EnergyController.getLatestEnergy);
router.get('/energy/range', requireAuth, EnergyController.getEnergyByDateRange);
router.get('/energy/pattern', requireAuth, EnergyController.getEnergyPattern);
router.get('/energy/insights', requireAuth, EnergyController.getEnergyInsights);

export default router;
