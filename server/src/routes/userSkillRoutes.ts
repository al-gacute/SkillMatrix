import { Router } from 'express';
import {
    getMySkills,
    getUserSkills,
    addUserSkill,
    updateUserSkill,
    deleteUserSkill,
    endorseSkill,
    removeEndorsement,
    searchBySkill,
} from '../controllers/userSkillController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/me', getMySkills);
router.get('/user/:userId', getUserSkills);
router.get('/search', searchBySkill);

router.route('/')
    .post(addUserSkill);

router.route('/:id')
    .put(updateUserSkill)
    .delete(deleteUserSkill);

router.route('/:id/endorse')
    .post(endorseSkill)
    .delete(removeEndorsement);

export default router;
