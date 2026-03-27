import { Router } from 'express';
import {
    getDashboardStats,
    getSkillGaps,
    getTopEndorsers,
    getSkillTrends,
    getOrganizationAlerts,
} from '../controllers/analyticsController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/organization-alerts', getOrganizationAlerts);
router.get('/skill-gaps', getSkillGaps);
router.get('/top-endorsers', getTopEndorsers);
router.get('/trends', getSkillTrends);

export default router;
