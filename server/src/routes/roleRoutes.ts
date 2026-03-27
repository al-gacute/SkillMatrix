import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
    getRoles,
    getRole,
    getBrowseMatrixAccessSetting,
    createRole,
    updateRole,
    deleteRole,
    initializeRoles,
    reorderRoles,
    updateBrowseMatrixAccessSetting,
} from '../controllers/roleController';

const router = express.Router();

router.use(protect);

router.get('/browse-matrix-access', getBrowseMatrixAccessSetting);
router.put('/browse-matrix-access', adminOnly, updateBrowseMatrixAccessSetting);
router.get('/', getRoles);
router.get('/:id', getRole);

// Admin only routes
router.post('/', adminOnly, createRole);
router.post('/init', adminOnly, initializeRoles);
router.put('/reorder', adminOnly, reorderRoles);
router.put('/:id', adminOnly, updateRole);
router.delete('/:id', adminOnly, deleteRole);

export default router;
