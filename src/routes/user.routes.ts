import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();

// User routes
router.post('/users', UserController.create);
router.get('/users', UserController.getAll);
router.get('/users/:id', UserController.getById);
router.put('/users/:id', UserController.update);
router.delete('/users/:id', UserController.delete);

export default router;
