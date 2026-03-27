import { Router } from 'express';
import {
    createProjectPosition,
    deleteProjectPosition,
    getProjectPositions,
    updateProjectPosition,
} from '../controllers/projectPositionController';
import { adminOnly, protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getProjectPositions)
    .post(adminOnly, createProjectPosition);

router.route('/:id')
    .put(adminOnly, updateProjectPosition)
    .delete(adminOnly, deleteProjectPosition);

export default router;
