import { Router } from 'express';
import { getUsers, getUser, updateUser, deleteUser, deactivateUser, reactivateUser, resetUserPassword } from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getUsers);

router.route('/:id')
    .get(getUser)
    .put(authorize('admin', 'division_manager', 'department_manager'), updateUser)
    .delete(authorize('admin'), deleteUser);

router.put('/:id/deactivate', authorize('admin'), deactivateUser);
router.put('/:id/reactivate', authorize('admin'), reactivateUser);
router.put('/:id/reset-password', authorize('admin'), resetUserPassword);

export default router;
