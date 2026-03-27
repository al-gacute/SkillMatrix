import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
    getFeedback,
    getFeedbackById,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    getFeedbackStats,
    getTeamFeedback,
} from '../controllers/feedbackController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get feedback statistics
router.get('/stats', getFeedbackStats);

// Get team feedback (for managers)
router.get('/team', authorize('team_leader', 'group_leader', 'department_manager', 'division_manager', 'admin'), getTeamFeedback);

// CRUD routes
router.route('/')
    .get(getFeedback)
    .post(createFeedback);

router.route('/:id')
    .get(getFeedbackById)
    .put(updateFeedback)
    .delete(deleteFeedback);

export default router;
