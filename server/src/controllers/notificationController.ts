import { Response } from 'express';
import { Notification, User, INotification } from '../models';
import { AuthRequest } from '../middleware/auth';
import {
    addCreateAuditFieldsForActor,
    buildAuditSetUpdate,
    buildDeletedAtFilter,
    buildSoftDeleteSetUpdate,
    softDeleteDocument,
} from '../utils/audit';
import { validateSingleUserAssignments } from '../utils/userAssignments';
import { excludeSystemUserAccounts } from '../utils/systemUserFilter';

// Get all notifications for current user
export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { unreadOnly } = req.query;

        const filter: Record<string, unknown> = buildDeletedAtFilter({ recipient: userId });
        if (unreadOnly === 'true') {
            filter.isRead = false;
        }

        const notifications = await Notification.find(filter)
            .populate('relatedUser', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
            deletedAt: null,
        });

        res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId, deletedAt: null },
            buildAuditSetUpdate({ isRead: true }, req),
            { new: true }
        ).populate('relatedUser', 'firstName lastName email');

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false, deletedAt: null },
            buildAuditSetUpdate({ isRead: true }, req)
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete all notifications for current user
export const clearAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        await Notification.updateMany(
            { recipient: userId, deletedAt: null },
            buildSoftDeleteSetUpdate(req)
        );

        res.json({
            success: true,
            message: 'All notifications cleared',
        });
    } catch (error) {
        console.error('Clear all notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Approve user registration (admin only)
export const approveUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        const { role, department, section, team, projectPosition } = req.body;
        const adminId = req.user?._id;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: adminId,
            type: 'new_user_registration',
            deletedAt: null,
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        if (notification.isActioned) {
            res.status(400).json({ success: false, message: 'This registration has already been processed' });
            return;
        }

        const relatedUser = await User.findById(notification.relatedUser);
        if (!relatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const assignmentValidation = await validateSingleUserAssignments({
            role,
            department,
            section,
            team,
            projectPosition,
        });

        if (!assignmentValidation.success) {
            res.status(assignmentValidation.status).json({ success: false, message: assignmentValidation.message });
            return;
        }

        const resolvedAssignments = assignmentValidation.data;

        if (resolvedAssignments.role) {
            relatedUser.role = resolvedAssignments.role;
        }

        relatedUser.isApproved = true;
        relatedUser.projectPosition = (resolvedAssignments.projectPosition as typeof relatedUser.projectPosition) || undefined;
        relatedUser.department = (resolvedAssignments.department as typeof relatedUser.department) || undefined;
        relatedUser.team = (resolvedAssignments.team as typeof relatedUser.team) || undefined;
        relatedUser.updatedBy = req.user?._id;
        await relatedUser.save();

        await createNotificationForUser(
            relatedUser._id.toString(),
            'Account approved',
            'Your account has been approved. You can now sign in.',
            'user_approved',
            undefined,
            undefined,
            adminId?.toString()
        );

        // Mark this notification as actioned
        notification.isActioned = true;
        notification.actionTaken = 'approved';
        notification.isRead = true;
        notification.updatedBy = req.user?._id;
        await notification.save();

        // Mark all other admin notifications for this user as actioned
        await Notification.updateMany(
            {
                relatedUser: notification.relatedUser,
                type: 'new_user_registration',
                _id: { $ne: notificationId },
                deletedAt: null,
            },
            buildAuditSetUpdate(
                {
                    isActioned: true,
                    actionTaken: 'approved',
                },
                req
            )
        );

        res.json({
            success: true,
            message: 'User approved successfully',
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Reject user registration (admin only)
export const rejectUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        const adminId = req.user?._id;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: adminId,
            type: 'new_user_registration',
            deletedAt: null,
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        if (notification.isActioned) {
            res.status(400).json({ success: false, message: 'This registration has already been processed' });
            return;
        }

        const relatedUser = await User.findById(notification.relatedUser);
        if (!relatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        await softDeleteDocument(relatedUser, req, {
            isActive: false,
            deactivatedAt: new Date(),
        });

        // Mark this notification as actioned
        notification.isActioned = true;
        notification.actionTaken = 'rejected';
        notification.isRead = true;
        notification.updatedBy = req.user?._id;
        await notification.save();

        // Mark all other admin notifications for this user as actioned
        await Notification.updateMany(
            {
                relatedUser: notification.relatedUser,
                type: 'new_user_registration',
                _id: { $ne: notificationId },
                deletedAt: null,
            },
            buildAuditSetUpdate(
                {
                    isActioned: true,
                    actionTaken: 'rejected',
                },
                req
            )
        );

        res.json({
            success: true,
            message: 'User registration rejected',
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const notification = await Notification.findOne({
            _id: id,
            recipient: userId,
            deletedAt: null,
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        await softDeleteDocument(notification, req);

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Submit a request for admins to add a category and/or skill
export const requestSkillCatalogItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const requester = req.user;
        const {
            categoryName,
            skillName,
            existingCategoryId,
            existingCategoryName,
            details,
        } = req.body;

        const trimmedCategoryName = typeof categoryName === 'string' ? categoryName.trim() : '';
        const trimmedSkillName = typeof skillName === 'string' ? skillName.trim() : '';
        const trimmedExistingCategoryName = typeof existingCategoryName === 'string' ? existingCategoryName.trim() : '';
        const trimmedDetails = typeof details === 'string' ? details.trim() : '';

        if (!requester) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        if (!trimmedCategoryName && !trimmedSkillName) {
            res.status(400).json({
                success: false,
                message: 'Provide a category name, a skill name, or both.',
            });
            return;
        }

        const requestParts: string[] = [];

        if (trimmedCategoryName) {
            requestParts.push(`new category: "${trimmedCategoryName}"`);
        }

        if (trimmedSkillName) {
            const categoryContext = trimmedExistingCategoryName
                ? ` under "${trimmedExistingCategoryName}"`
                : trimmedCategoryName
                    ? ` under new category "${trimmedCategoryName}"`
                    : '';
            requestParts.push(`new skill: "${trimmedSkillName}"${categoryContext}`);
        }

        if (trimmedDetails) {
            requestParts.push(`Details: ${trimmedDetails}`);
        }

        const title = 'Skill catalog request';
        const requesterName = `${requester.firstName} ${requester.lastName}`.trim();
        const message = `${requesterName} (${requester.email}) requested ${requestParts.join('. ')}.`;

        await createAdminNotifications(
            'general',
            title,
            message,
            String(requester._id),
            {
                catalogRequest: {
                    categoryName: trimmedCategoryName || undefined,
                    skillName: trimmedSkillName || undefined,
                    existingCategoryId: existingCategoryId || undefined,
                    existingCategoryName: trimmedExistingCategoryName || undefined,
                    details: trimmedDetails || undefined,
                },
            }
        );

        res.status(201).json({
            success: true,
            message: 'Your request has been sent to the admin team.',
            data: {
                categoryName: trimmedCategoryName || undefined,
                skillName: trimmedSkillName || undefined,
                existingCategoryId: existingCategoryId || undefined,
                existingCategoryName: trimmedExistingCategoryName || undefined,
                details: trimmedDetails || undefined,
            },
        });
    } catch (error) {
        console.error('Request skill catalog item error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Accept a skill catalog request (admin only)
export const acceptSkillCatalogRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        const adminId = req.user?._id;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: adminId,
            type: 'general',
            title: 'Skill catalog request',
            deletedAt: null,
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        if (notification.isActioned) {
            res.status(400).json({ success: false, message: 'This request has already been processed' });
            return;
        }

        notification.isActioned = true;
        notification.isRead = true;
        notification.updatedBy = req.user?._id;
        await notification.save();

        await Notification.updateMany(
            {
                relatedUser: notification.relatedUser,
                type: 'general',
                title: 'Skill catalog request',
                message: notification.message,
                _id: { $ne: notificationId },
                deletedAt: null,
            },
            buildAuditSetUpdate(
                {
                    isActioned: true,
                    isRead: true,
                },
                req
            )
        );

        res.json({
            success: true,
            message: 'Skill catalog request accepted',
        });
    } catch (error) {
        console.error('Accept skill catalog request error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Reject a skill catalog request (admin only)
export const rejectSkillCatalogRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?._id;
        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

        if (!trimmedReason) {
            res.status(400).json({ success: false, message: 'A rejection reason is required' });
            return;
        }

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: adminId,
            type: 'general',
            title: 'Skill catalog request',
            deletedAt: null,
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        if (notification.isActioned) {
            res.status(400).json({ success: false, message: 'This request has already been processed' });
            return;
        }

        notification.isActioned = true;
        notification.actionTaken = 'rejected';
        notification.isRead = true;
        notification.updatedBy = req.user?._id;
        await notification.save();

        await Notification.updateMany(
            {
                relatedUser: notification.relatedUser,
                type: 'general',
                title: 'Skill catalog request',
                message: notification.message,
                _id: { $ne: notificationId },
                deletedAt: null,
            },
            buildAuditSetUpdate(
                {
                    isActioned: true,
                    actionTaken: 'rejected',
                    isRead: true,
                },
                req
            )
        );

        if (notification.relatedUser) {
            await Notification.create(addCreateAuditFieldsForActor({
                recipient: notification.relatedUser,
                type: 'general',
                title: 'Skill catalog request rejected',
                message: `Your skill catalog request was rejected. Reason: ${trimmedReason}`,
            }, req.user?._id));
        }

        res.json({
            success: true,
            message: 'Skill catalog request rejected',
        });
    } catch (error) {
        console.error('Reject skill catalog request error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Helper function to create notifications for all admins (used internally)
export const createAdminNotifications = async (
    type: string,
    title: string,
    message: string,
    relatedUserId?: string,
    metadata?: Record<string, unknown>
) => {
    try {
        const admins = await User.find({ role: 'admin' });

        const notifications = admins.map((admin) => ({
            ...addCreateAuditFieldsForActor(
                {
                    recipient: admin._id,
                    type,
                    title,
                    message,
                    relatedUser: relatedUserId,
                    metadata,
                },
                relatedUserId
            ),
        }));

        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Create admin notifications error:', error);
    }
};

// Helper function to create a general notification for all approved active users
export const createUserNotifications = async (
    title: string,
    message: string,
    actorUserId?: string
) => {
    try {
        const filter: Record<string, unknown> = {
            isApproved: true,
            isActive: true,
        };

        const users = await User.find(excludeSystemUserAccounts(filter)).select('_id');

        if (users.length === 0) {
            return;
        }

        const notifications = users.map((user) => ({
            ...addCreateAuditFieldsForActor(
                {
                    recipient: user._id,
                    type: 'general' as const,
                    title,
                    message,
                },
                actorUserId
            ),
        }));

        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Create user notifications error:', error);
    }
};

// Helper function to create a notification for a single user
export const createNotificationForUser = async (
    recipientUserId: string,
    title: string,
    message: string,
    type: INotification['type'] = 'general',
    relatedUserId?: string,
    metadata?: Record<string, unknown>,
    actorUserId?: string
) => {
    try {
        await Notification.create(addCreateAuditFieldsForActor({
            recipient: recipientUserId,
            type,
            title,
            message,
            relatedUser: relatedUserId,
            metadata,
        }, actorUserId || relatedUserId));
    } catch (error) {
        console.error('Create notification for user error:', error);
    }
};
