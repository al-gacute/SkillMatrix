import { Router } from 'express';
import {
    getDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from '../controllers/departmentController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getDepartments)
    .post(authorize('admin', 'division_manager'), createDepartment);

router.route('/:id')
    .get(getDepartment)
    .put(authorize('admin', 'division_manager'), updateDepartment)
    .delete(authorize('admin'), deleteDepartment);

export default router;
