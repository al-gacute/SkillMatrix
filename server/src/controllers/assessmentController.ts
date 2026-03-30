import { Response } from 'express';
import { Assessment, User, ROLE_HIERARCHY } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUser } from './notificationController';
import { addCreateAuditFields, buildDeletedAtFilter, softDeleteDocument } from '../utils/audit';
import { excludeSystemUserAccounts } from '../utils/systemUserFilter';

type ScopedUser = {
    _id: { toString(): string } | string;
    role: string;
    roleLevel?: number;
    department?: { _id?: { toString(): string } | string } | string | null;
    team?: {
        _id?: { toString(): string } | string;
        section?: { _id?: { toString(): string } | string } | string | null;
        department?: { _id?: { toString(): string } | string } | string | null;
    } | string | null;
};

const getEntityId = (value: unknown): string => {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
        const nestedId = (value as { _id?: { toString(): string } | string })._id;
        return nestedId ? nestedId.toString() : '';
    }

    if (typeof value === 'object' && 'toString' in (value as Record<string, unknown>)) {
        return String(value);
    }

    return '';
};

const getRoleLevel = (user: ScopedUser): number =>
    user.roleLevel || ROLE_HIERARCHY[user.role] || 1;

const getDepartmentId = (user: ScopedUser): string =>
    getEntityId(user.department) || getEntityId(typeof user.team === 'object' ? user.team?.department : undefined);

const getTeamId = (user: ScopedUser): string =>
    getEntityId(user.team);

const getSectionId = (user: ScopedUser): string =>
    getEntityId(typeof user.team === 'object' ? user.team?.section : undefined);

const canAssessUser = (assessor: ScopedUser, assessee: ScopedUser): boolean => {
    if (getEntityId(assessor._id) === getEntityId(assessee._id)) {
        return false;
    }

    const assessorRoleLevel = getRoleLevel(assessor);
    const assesseeRoleLevel = getRoleLevel(assessee);

    if (assessorRoleLevel <= assesseeRoleLevel) {
        return false;
    }

    if (assessor.role === 'admin' || assessor.role === 'division_manager') {
        return true;
    }

    if (assessor.role === 'department_manager') {
        const assessorDepartmentId = getDepartmentId(assessor);
        const assesseeDepartmentId = getDepartmentId(assessee);
        return Boolean(assessorDepartmentId && assessorDepartmentId === assesseeDepartmentId);
    }

    if (assessor.role === 'group_leader') {
        const assessorSectionId = getSectionId(assessor);
        const assesseeSectionId = getSectionId(assessee);
        return Boolean(assessorSectionId && assessorSectionId === assesseeSectionId);
    }

    if (assessor.role === 'team_leader') {
        const assessorTeamId = getTeamId(assessor);
        const assesseeTeamId = getTeamId(assessee);
        return Boolean(assessorTeamId && assessorTeamId === assesseeTeamId);
    }

    return false;
};

const assessmentUserPopulate = [
    { path: 'department', select: 'name' },
    {
        path: 'team',
        select: 'name section department',
        populate: [
            { path: 'section', select: 'name department' },
            { path: 'department', select: 'name' },
        ],
    },
];

// @desc    Get assessments (as assessor or assessee)
// @route   GET /api/assessments
// @access  Private
export const getAssessments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, status, type } = req.query;
        const userId = req.user?._id;

        let query: Record<string, unknown> = {};

        // Filter by role (assessor or assessee)
        if (role === 'assessor') {
            query.assessor = userId;
        } else if (role === 'assessee') {
            query.assessee = userId;
        } else {
            query = { $or: [{ assessor: userId }, { assessee: userId }] };
        }

        if (status) query.status = status;
        if (type) query.type = type;

        const assessments = await Assessment.find(buildDeletedAtFilter(query))
            .populate('assessor', 'firstName lastName email role roleLevel')
            .populate('assessee', 'firstName lastName email role roleLevel')
            .populate('skillRatings.skill', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: assessments, count: assessments.length });
    } catch (error) {
        console.error('GetAssessments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single assessment
// @route   GET /api/assessments/:id
// @access  Private
export const getAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const assessment = await Assessment.findOne({ _id: req.params.id, deletedAt: null })
            .populate('assessor', 'firstName lastName email role roleLevel avatar')
            .populate('assessee', 'firstName lastName email role roleLevel avatar')
            .populate('skillRatings.skill', 'name description');

        if (!assessment) {
            res.status(404).json({ success: false, message: 'Assessment not found' });
            return;
        }

        // Check if user has access (assessor, assessee, or admin)
        const userId = req.user?._id.toString();
        const isAssessor = assessment.assessor._id.toString() === userId;
        const isAssessee = assessment.assessee._id.toString() === userId;
        const isAdmin = req.user?.role === 'admin';

        if (!isAssessor && !isAssessee && !isAdmin) {
            res.status(403).json({ success: false, message: 'Not authorized to view this assessment' });
            return;
        }

        res.status(200).json({ success: true, data: assessment });
    } catch (error) {
        console.error('GetAssessment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get subordinates for assessment (users below in hierarchy)
// @route   GET /api/assessments/subordinates
// @access  Private (Team Leader and above)
export const getSubordinates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const assessor = await User.findById(currentUser._id)
            .populate(assessmentUserPopulate[0].path, assessmentUserPopulate[0].select)
            .populate(assessmentUserPopulate[1]);

        if (!assessor) {
            res.status(404).json({ success: false, message: 'Assessor not found' });
            return;
        }

        const currentRoleLevel = assessor.roleLevel || ROLE_HIERARCHY[assessor.role] || 1;

        const candidates = await User.find(excludeSystemUserAccounts({
            roleLevel: { $lt: currentRoleLevel },
            _id: { $ne: assessor._id },
        }))
            .select('firstName lastName email role roleLevel department team avatar title')
            .populate(assessmentUserPopulate[0].path, assessmentUserPopulate[0].select)
            .populate(assessmentUserPopulate[1]);

        const subordinates = candidates.filter((candidate) => canAssessUser(assessor as unknown as ScopedUser, candidate as unknown as ScopedUser));

        res.status(200).json({ success: true, data: subordinates, count: subordinates.length });
    } catch (error) {
        console.error('GetSubordinates error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create assessment
// @route   POST /api/assessments
// @access  Private
export const createAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { assessee, period, type, skillRatings, performanceRating, strengths, areasForImprovement, goals, overallComments } = req.body;
        const assessor = req.user;

        if (!assessor) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const assessorUser = await User.findById(assessor._id)
            .populate(assessmentUserPopulate[0].path, assessmentUserPopulate[0].select)
            .populate(assessmentUserPopulate[1]);

        if (!assessorUser) {
            res.status(404).json({ success: false, message: 'Assessor not found' });
            return;
        }

        const assesseeUser = await User.findById(assessee)
            .populate(assessmentUserPopulate[0].path, assessmentUserPopulate[0].select)
            .populate(assessmentUserPopulate[1]);
        if (!assesseeUser) {
            res.status(404).json({ success: false, message: 'Assessee not found' });
            return;
        }

        if (assessorUser._id.toString() === assesseeUser._id.toString()) {
            res.status(400).json({ success: false, message: 'You cannot create an assessment for yourself' });
            return;
        }

        if (!canAssessUser(assessorUser as unknown as ScopedUser, assesseeUser as unknown as ScopedUser)) {
            res.status(403).json({ success: false, message: 'You are not authorized to assess this user' });
            return;
        }

        // Check for existing assessment in same period
        const existingAssessment = await Assessment.findOne({
            assessor: assessorUser._id,
            assessee,
            period,
            deletedAt: null,
        });

        if (existingAssessment) {
            res.status(400).json({ success: false, message: 'Assessment already exists for this user and period' });
            return;
        }

        const assessment = await Assessment.create(addCreateAuditFields({
            assessor: assessorUser._id,
            assessee,
            period,
            type: type || 'quarterly',
            skillRatings: skillRatings || [],
            performanceRating,
            strengths: strengths || [],
            areasForImprovement: areasForImprovement || [],
            goals: goals || [],
            overallComments,
        }, req));

        const populatedAssessment = await Assessment.findById(assessment._id)
            .populate('assessor', 'firstName lastName email role')
            .populate('assessee', 'firstName lastName email role')
            .populate('skillRatings.skill', 'name');

        await createNotificationForUser(
            assesseeUser._id.toString(),
            'New assessment received',
            `${assessorUser.firstName} ${assessorUser.lastName} created an assessment for you${period ? ` for ${period}` : ''}.`,
            'assessment_received',
            assessorUser._id.toString()
        );

        res.status(201).json({ success: true, data: populatedAssessment });
    } catch (error) {
        console.error('CreateAssessment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update assessment
// @route   PUT /api/assessments/:id
// @access  Private
export const updateAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const assessment = await Assessment.findOne({ _id: req.params.id, deletedAt: null });

        if (!assessment) {
            res.status(404).json({ success: false, message: 'Assessment not found' });
            return;
        }

        // Only assessor can update (unless it's acknowledgment)
        const userId = req.user?._id.toString();
        const isAssessor = assessment.assessor.toString() === userId;
        const isAssessee = assessment.assessee.toString() === userId;

        if (!isAssessor && !isAssessee) {
            res.status(403).json({ success: false, message: 'Not authorized to update this assessment' });
            return;
        }

        // If assessee, only allow acknowledgment fields
        if (isAssessee && !isAssessor) {
            const { assesseeAcknowledged, assesseeComments } = req.body;
            const wasAcknowledged = assessment.assesseeAcknowledged;
            assessment.assesseeAcknowledged = assesseeAcknowledged;
            assessment.assesseeComments = assesseeComments;
            if (assesseeAcknowledged) {
                assessment.acknowledgedAt = new Date();
                assessment.status = 'completed';
                if (!assessment.completedAt) {
                    assessment.completedAt = new Date();
                }
            }
            assessment.updatedBy = req.user?._id;
            await assessment.save();

            if (assesseeAcknowledged && !wasAcknowledged && req.user) {
                const receiverName = `${req.user.firstName} ${req.user.lastName}`;
                await createNotificationForUser(
                    assessment.assessor.toString(),
                    'Assessment acknowledged',
                    `${receiverName} acknowledged your assessment${assessment.period ? ` for ${assessment.period}` : '.'}`,
                    'general',
                    assessment.assessee.toString()
                );
            }
        } else {
            // Assessor can update all fields
            const previousStatus = assessment.status;
            const allowedFields = ['skillRatings', 'performanceRating', 'strengths', 'areasForImprovement', 'goals', 'overallComments', 'status'];
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    (assessment as unknown as Record<string, unknown>)[field] = req.body[field];
                }
            }

            // Update status timestamps
            if (req.body.status === 'submitted' && !assessment.submittedAt) {
                assessment.submittedAt = new Date();
            }
            if (req.body.status === 'reviewed' && !assessment.reviewedAt) {
                assessment.reviewedAt = new Date();
            }
            if (req.body.status === 'completed' && !assessment.completedAt) {
                assessment.completedAt = new Date();
            }

            assessment.updatedBy = req.user?._id;
            await assessment.save();

            if (
                req.body.status === 'submitted' &&
                previousStatus !== 'submitted' &&
                req.user
            ) {
                const assessorName = `${req.user.firstName} ${req.user.lastName}`;
                await createNotificationForUser(
                    assessment.assessee.toString(),
                    'Assessment submitted for review',
                    `${assessorName} submitted an assessment for your review${assessment.period ? ` for ${assessment.period}` : '.'}`,
                    'assessment_received',
                    assessment.assessor.toString()
                );
            }
        }

        const updatedAssessment = await Assessment.findById(req.params.id)
            .populate('assessor', 'firstName lastName email role')
            .populate('assessee', 'firstName lastName email role')
            .populate('skillRatings.skill', 'name');

        res.status(200).json({ success: true, data: updatedAssessment });
    } catch (error) {
        console.error('UpdateAssessment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete assessment
// @route   DELETE /api/assessments/:id
// @access  Private (assessor or admin)
export const deleteAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const assessment = await Assessment.findOne({ _id: req.params.id, deletedAt: null });

        if (!assessment) {
            res.status(404).json({ success: false, message: 'Assessment not found' });
            return;
        }

        const userId = req.user?._id.toString();
        const isAssessor = assessment.assessor.toString() === userId;
        const isAdmin = req.user?.role === 'admin';

        if (!isAssessor && !isAdmin) {
            res.status(403).json({ success: false, message: 'Not authorized to delete this assessment' });
            return;
        }

        // Only allow deletion of draft assessments
        if (assessment.status !== 'draft' && !isAdmin) {
            res.status(400).json({ success: false, message: 'Can only delete draft assessments' });
            return;
        }

        await softDeleteDocument(assessment, req);

        res.status(200).json({ success: true, message: 'Assessment deleted' });
    } catch (error) {
        console.error('DeleteAssessment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get assessment statistics
// @route   GET /api/assessments/stats
// @access  Private (Manager and above)
export const getAssessmentStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        // Stats for assessments given
        const givenStats = await Assessment.aggregate([
            { $match: { assessor: userId, deletedAt: null } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Stats for assessments received
        const receivedStats = await Assessment.aggregate([
            { $match: { assessee: userId, deletedAt: null } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$performanceRating' },
                },
            },
        ]);

        // Recent assessments
        const recentAssessments = await Assessment.find(buildDeletedAtFilter({
            $or: [{ assessor: userId }, { assessee: userId }],
        }))
            .populate('assessor', 'firstName lastName')
            .populate('assessee', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                given: givenStats,
                received: receivedStats,
                recent: recentAssessments,
            },
        });
    } catch (error) {
        console.error('GetAssessmentStats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
