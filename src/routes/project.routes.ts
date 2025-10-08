import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/projects', requireAuth, ProjectController.create);
router.get('/projects', requireAuth, ProjectController.getProjects);
router.get('/projects/:id', requireAuth, ProjectController.getById);
router.put('/projects/:id', requireAuth, ProjectController.update);
router.post('/projects/:id/archive', requireAuth, ProjectController.archive);
router.delete('/projects/:id', requireAuth, ProjectController.delete);

export default router;
