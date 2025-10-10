import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.post('/notifications/preferences', requireAuth, NotificationController.updatePreferences);
router.get('/notifications/preferences', requireAuth, NotificationController.getPreferences);
router.post('/notifications/send-test', requireAuth, NotificationController.sendTestEmail);

export default router;
