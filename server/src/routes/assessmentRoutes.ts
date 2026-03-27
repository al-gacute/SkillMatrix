import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
    getAssessments,
    getAssessment,
    getSubordinates,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getAssessmentStats,
} from '../controllers/assessmentController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get subordinates (for creating assessments)
router.get('/subordinates', authorize('team_leader', 'group_leader', 'department_manager', 'division_manager', 'admin'), getSubordinates);

// Get assessment statistics
router.get('/stats', getAssessmentStats);

// CRUD routes
router.route('/')
    .get(getAssessments)
    .post(createAssessment);

router.route('/:id')
    .get(getAssessment)
    .put(updateAssessment)
    .delete(deleteAssessment);

export default router;
