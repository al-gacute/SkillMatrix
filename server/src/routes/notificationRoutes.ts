import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    approveUser,
    rejectUser,
    deleteNotification,
    requestSkillCatalogItem,
    acceptSkillCatalogRequest,
    rejectSkillCatalogRequest,
} from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get notifications for current user
router.get('/', getMyNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.put('/mark-all-read', markAllAsRead);

// Clear all notifications
router.delete('/clear-all', clearAllNotifications);

// Submit a request to admins for a new category and/or skill
router.post('/catalog-request', requestSkillCatalogItem);

// Mark single notification as read
router.put('/:id/read', markAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Admin actions on user registration notifications
router.post('/:notificationId/approve', adminOnly, approveUser);
router.post('/:notificationId/reject', adminOnly, rejectUser);
router.post('/:notificationId/catalog-accept', adminOnly, acceptSkillCatalogRequest);
router.post('/:notificationId/catalog-reject', adminOnly, rejectSkillCatalogRequest);

export default router;
