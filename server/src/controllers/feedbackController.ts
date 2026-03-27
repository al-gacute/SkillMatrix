import { Response } from 'express';
import { Feedback, User, ROLE_HIERARCHY } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUser } from './notificationController';
import { addCreateAuditFields, buildDeletedAtFilter, softDeleteDocument } from '../utils/audit';

// @desc    Get feedback (given, received, or all visible)
// @route   GET /api/feedback
// @access  Private
export const getFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, type, visibility } = req.query;
        const userId = req.user?._id;
        const userRole = req.user?.role;
        const userRoleLevel = req.user?.roleLevel || ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 1;

        let query: Record<string, unknown> = {};

        // Filter by role (giver, receiver)
        if (role === 'giver') {
            query.giver = userId;
        } else if (role === 'receiver') {
            query.receiver = userId;
        } else {
            // Show feedback user gave, received, or can see based on visibility
            const visibilityConditions: Record<string, unknown>[] = [
                { giver: userId },
                { receiver: userId },
                { visibility: 'public' },
            ];

            // Managers and above can see manager_only feedback for their subordinates
            if (userRoleLevel >= 2) {
                visibilityConditions.push({ visibility: 'manager_only' });
            }

            query = { $or: visibilityConditions };
        }

        if (type) query.type = type;
        if (visibility) query.visibility = visibility;

        const feedbackList = await Feedback.find(buildDeletedAtFilter(query))
            .populate('giver', 'firstName lastName email role roleLevel avatar')
            .populate('receiver', 'firstName lastName email role roleLevel avatar')
            .populate('relatedSkill', 'name')
            .populate('reviewedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: feedbackList, count: feedbackList.length });
    } catch (error) {
        console.error('GetFeedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private
export const getFeedbackById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const feedback = await Feedback.findOne({ _id: req.params.id, deletedAt: null })
            .populate('giver', 'firstName lastName email role roleLevel avatar')
            .populate('receiver', 'firstName lastName email role roleLevel avatar')
            .populate('relatedSkill', 'name description')
            .populate('reviewedBy', 'firstName lastName');

        if (!feedback) {
            res.status(404).json({ success: false, message: 'Feedback not found' });
            return;
        }

        const userId = req.user?._id.toString();
        const userRoleLevel = req.user?.roleLevel || 1;
        const isGiver = feedback.giver._id.toString() === userId;
        const isReceiver = feedback.receiver._id.toString() === userId;
        const isAdmin = req.user?.role === 'admin';
        const isPublic = feedback.visibility === 'public';
        const canViewManagerOnly = feedback.visibility === 'manager_only' && userRoleLevel >= 2;

        if (!isGiver && !isReceiver && !isAdmin && !isPublic && !canViewManagerOnly) {
            res.status(403).json({ success: false, message: 'Not authorized to view this feedback' });
            return;
        }

        res.status(200).json({ success: true, data: feedback });
    } catch (error) {
        console.error('GetFeedbackById error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create feedback
// @route   POST /api/feedback
// @access  Private
export const createFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            receiver,
            type,
            visibility,
            title,
            content,
            period,
            reviewType,
            strengths,
            areasForImprovement,
            overallComments,
            relatedSkill,
            relatedProject,
            rating,
        } = req.body;
        const giver = req.user;

        if (!giver) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Verify receiver exists
        const receiverUser = await User.findById(receiver);
        if (!receiverUser) {
            res.status(404).json({ success: false, message: 'Receiver not found' });
            return;
        }

        // Cannot give feedback to yourself
        if (giver._id.toString() === receiver) {
            res.status(400).json({ success: false, message: 'Cannot give feedback to yourself' });
            return;
        }

        const feedback = await Feedback.create(addCreateAuditFields({
            giver: giver._id,
            receiver,
            type,
            visibility: visibility || 'manager_only',
            title,
            content,
            period,
            reviewType,
            strengths: strengths || [],
            areasForImprovement: areasForImprovement || [],
            overallComments,
            relatedSkill,
            relatedProject,
            rating,
        }, req));

        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate('giver', 'firstName lastName email role avatar')
            .populate('receiver', 'firstName lastName email role avatar')
            .populate('relatedSkill', 'name');

        await createNotificationForUser(
            receiverUser._id.toString(),
            'New feedback received',
            `${giver.firstName} ${giver.lastName} sent you feedback${title ? `: ${title}` : '.'}`,
            'feedback_received',
            giver._id.toString()
        );

        res.status(201).json({ success: true, data: populatedFeedback });
    } catch (error) {
        console.error('CreateFeedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private
export const updateFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const feedback = await Feedback.findOne({ _id: req.params.id, deletedAt: null });

        if (!feedback) {
            res.status(404).json({ success: false, message: 'Feedback not found' });
            return;
        }

        const userId = req.user?._id.toString();
        const userRoleLevel = req.user?.roleLevel || 1;
        const isGiver = feedback.giver.toString() === userId;
        const isReceiver = feedback.receiver.toString() === userId;
        const isManager = userRoleLevel >= 2;
        const isAdmin = req.user?.role === 'admin';

        // Receiver can acknowledge and respond, regardless of manager/admin role
        if (isReceiver && !isGiver) {
            const { isAcknowledged, receiverResponse } = req.body;
            const wasAcknowledged = feedback.isAcknowledged;
            feedback.isAcknowledged = isAcknowledged;
            feedback.receiverResponse = receiverResponse;
            if (isAcknowledged && !feedback.acknowledgedAt) {
                feedback.acknowledgedAt = new Date();
            }
            feedback.updatedBy = req.user?._id;
            await feedback.save();

            if (isAcknowledged && !wasAcknowledged) {
                const receiverName = req.user
                    ? `${req.user.firstName} ${req.user.lastName}`
                    : 'The recipient';

                await createNotificationForUser(
                    feedback.giver.toString(),
                    'Feedback acknowledged',
                    `${receiverName} acknowledged your feedback${feedback.title ? `: ${feedback.title}` : '.'}`,
                    'general',
                    feedback.receiver.toString()
                );
            }
        }
        // Managers can review feedback
        else if (isManager && !isGiver) {
            const { isReviewed, managerNotes } = req.body;
            if (isReviewed !== undefined) {
                feedback.isReviewed = isReviewed;
                feedback.reviewedBy = req.user?._id;
                feedback.reviewedAt = new Date();
            }
            if (managerNotes) {
                feedback.managerNotes = managerNotes;
            }
            feedback.updatedBy = req.user?._id;
            await feedback.save();
        }
        // Giver can update content (if not reviewed yet)
        else if (isGiver) {
            if (feedback.isReviewed && !isAdmin) {
                res.status(400).json({ success: false, message: 'Cannot edit reviewed feedback' });
                return;
            }

            const allowedFields = [
                'type',
                'visibility',
                'title',
                'content',
                'period',
                'reviewType',
                'strengths',
                'areasForImprovement',
                'overallComments',
                'relatedSkill',
                'relatedProject',
                'rating',
            ];
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    (feedback as unknown as Record<string, unknown>)[field] = req.body[field];
                }
            }
            feedback.updatedBy = req.user?._id;
            await feedback.save();
        } else if (!isAdmin) {
            res.status(403).json({ success: false, message: 'Not authorized to update this feedback' });
            return;
        }

        const updatedFeedback = await Feedback.findById(req.params.id)
            .populate('giver', 'firstName lastName email role')
            .populate('receiver', 'firstName lastName email role')
            .populate('relatedSkill', 'name')
            .populate('reviewedBy', 'firstName lastName');

        res.status(200).json({ success: true, data: updatedFeedback });
    } catch (error) {
        console.error('UpdateFeedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
export const deleteFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const feedback = await Feedback.findOne({ _id: req.params.id, deletedAt: null });

        if (!feedback) {
            res.status(404).json({ success: false, message: 'Feedback not found' });
            return;
        }

        const userId = req.user?._id.toString();
        const isGiver = feedback.giver.toString() === userId;
        const isAdmin = req.user?.role === 'admin';

        if (!isGiver && !isAdmin) {
            res.status(403).json({ success: false, message: 'Not authorized to delete this feedback' });
            return;
        }

        // Only allow deletion if not reviewed (unless admin)
        if (feedback.isReviewed && !isAdmin) {
            res.status(400).json({ success: false, message: 'Cannot delete reviewed feedback' });
            return;
        }

        await softDeleteDocument(feedback, req);

        res.status(200).json({ success: true, message: 'Feedback deleted' });
    } catch (error) {
        console.error('DeleteFeedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Private
export const getFeedbackStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        // Stats for feedback given
        const givenByType = await Feedback.aggregate([
            { $match: { giver: userId, deletedAt: null } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Stats for feedback received
        const receivedByType = await Feedback.aggregate([
            { $match: { receiver: userId, deletedAt: null } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                },
            },
        ]);

        // Unacknowledged feedback count
        const unacknowledgedCount = await Feedback.countDocuments({
            receiver: userId,
            isAcknowledged: false,
            deletedAt: null,
        });

        // Recent feedback
        const recentFeedback = await Feedback.find(buildDeletedAtFilter({
            $or: [{ giver: userId }, { receiver: userId }],
        }))
            .populate('giver', 'firstName lastName')
            .populate('receiver', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                given: givenByType,
                received: receivedByType,
                unacknowledged: unacknowledgedCount,
                recent: recentFeedback,
            },
        });
    } catch (error) {
        console.error('GetFeedbackStats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get team feedback (for managers)
// @route   GET /api/feedback/team
// @access  Private (Team Leader and above)
export const getTeamFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userRoleLevel = req.user?.roleLevel || 1;

        if (userRoleLevel < 2) {
            res.status(403).json({ success: false, message: 'Only team leaders and above can view team feedback' });
            return;
        }

        // Get all users with lower role level
        const subordinateIds = await User.find({
            roleLevel: { $lt: userRoleLevel },
        }).distinct('_id');

        const teamFeedback = await Feedback.find({
            $or: [
                { giver: { $in: subordinateIds } },
                { receiver: { $in: subordinateIds } },
            ],
            visibility: { $ne: 'private' },
            deletedAt: null,
        })
            .populate('giver', 'firstName lastName email role')
            .populate('receiver', 'firstName lastName email role')
            .populate('relatedSkill', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, data: teamFeedback, count: teamFeedback.length });
    } catch (error) {
        console.error('GetTeamFeedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
