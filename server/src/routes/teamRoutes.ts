import { Router } from 'express';
import {
    getTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
} from '../controllers/teamController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(getTeams)
    .post(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), createTeam);

router.route('/:id')
    .get(getTeam)
    .put(authorize('admin', 'division_manager', 'department_manager', 'group_leader'), updateTeam)
    .delete(authorize('admin'), deleteTeam);

router.route('/:id/members')
    .post(authorize('admin', 'division_manager', 'department_manager', 'group_leader', 'team_leader'), addTeamMember);

router.delete('/:id/members/:userId', authorize('admin', 'division_manager', 'department_manager', 'group_leader', 'team_leader'), removeTeamMember);

export default router;
