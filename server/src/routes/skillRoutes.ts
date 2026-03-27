import { Router } from 'express';
import {
    getSkills,
    getSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    getSkillStats,
} from '../controllers/skillController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getSkills)
    .post(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), createSkill);

router.route('/:id')
    .get(getSkill)
    .put(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), updateSkill)
    .delete(authorize('admin'), deleteSkill);

router.get('/:id/stats', getSkillStats);

export default router;
