import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.post('/tasks', requireAuth, TaskController.create);
router.get('/tasks', requireAuth, TaskController.getTasks);
router.get('/tasks/stats', requireAuth, TaskController.getStats);
router.get('/tasks/:id', requireAuth, TaskController.getById);
router.put('/tasks/:id', requireAuth, TaskController.update);
router.post('/tasks/:id/complete', requireAuth, TaskController.complete);
router.delete('/tasks/:id', requireAuth, TaskController.delete);

export default router;
