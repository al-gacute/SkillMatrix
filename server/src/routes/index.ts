import { Router } from 'express';
import authRoutes from './authRoutes';
import skillRoutes from './skillRoutes';
import categoryRoutes from './categoryRoutes';
import userSkillRoutes from './userSkillRoutes';
import userRoutes from './userRoutes';
import departmentRoutes from './departmentRoutes';
import sectionRoutes from './sectionRoutes';
import teamRoutes from './teamRoutes';
import analyticsRoutes from './analyticsRoutes';
import assessmentRoutes from './assessmentRoutes';
import feedbackRoutes from './feedbackRoutes';
import roleRoutes from './roleRoutes';
import notificationRoutes from './notificationRoutes';
import projectPositionRoutes from './projectPositionRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/skills', skillRoutes);
router.use('/categories', categoryRoutes);
router.use('/user-skills', userSkillRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/sections', sectionRoutes);
router.use('/teams', teamRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/roles', roleRoutes);
router.use('/project-positions', projectPositionRoutes);
router.use('/notifications', notificationRoutes);

export default router;
