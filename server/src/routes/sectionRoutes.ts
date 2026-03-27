import { Router } from 'express';
import {
    getSections,
    createSection,
    updateSection,
    deleteSection,
} from '../controllers/sectionController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getSections)
    .post(authorize('admin', 'division_manager', 'department_manager'), createSection);

router.route('/:id')
    .put(authorize('admin', 'division_manager', 'department_manager'), updateSection)
    .delete(authorize('admin'), deleteSection);

export default router;
