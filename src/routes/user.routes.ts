import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes (no authentication required)
// None for now - all user routes should be protected

// Protected routes (authentication required)
router.post('/users', UserController.create); // Will be protected after we verify auth works
router.get('/users', requireAuth, UserController.getAll);
router.get('/users/:id', requireAuth, UserController.getById);
router.put('/users/:id', requireAuth, UserController.update);
router.delete('/users/:id', requireAuth, UserController.delete);

export default router;
