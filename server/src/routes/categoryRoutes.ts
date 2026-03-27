import { Router } from 'express';
import {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getCategories)
    .post(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), createCategory);

router.route('/:id')
    .get(getCategory)
    .put(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), updateCategory)
    .delete(authorize('admin'), deleteCategory);

export default router;
