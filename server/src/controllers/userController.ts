import { Response } from 'express';
import { Endorsement, Role, Team, User, UserSkill } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUser } from './notificationController';
import { checkForDuplicateUser } from '../utils/userDuplicateChecks';
import { buildSoftDeleteSetUpdate, softDeleteDocument } from '../utils/audit';
import { canBrowseMatrixUser, getBrowseMatrixAccessMode, getUserRoleLevel, isBrowseMatrixContext } from '../utils/browseMatrixAccess';
import { validateSingleUserAssignments } from '../utils/userAssignments';
import { excludeSystemUserAccounts } from '../utils/systemUserFilter';

const userDetailPopulate = [
    { path: 'projectPosition', select: 'name' },
    { path: 'department', select: 'name' },
    {
        path: 'team',
        select: 'name section',
        populate: { path: 'section', select: 'name department' },
    },
];

const getPopulatedUserById = async (userId: string) =>
    User.findById(userId)
        .select('-password')
        .populate(userDetailPopulate);

const getSafeUserById = async (userId: string) => {
    try {
        return await getPopulatedUserById(userId);
    } catch (error) {
        console.warn('Falling back to non-populated user payload:', error);
        return User.findById(userId).select('-password');
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { search, department, section, team, role, status, approval, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const browseMatrixContext = isBrowseMatrixContext(req.query.context);

        const query: Record<string, unknown> = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        if (department) {
            query.department = department;
        }

        if (section && !team) {
            const sectionTeamIds = await Team.find({ section }).distinct('_id');
            query.team = { $in: sectionTeamIds };
        }

        if (team) {
            query.team = team;
        }

        if (role) {
            query.role = role;
        }

        if (approval === 'approved') {
            query.isApproved = true;
        } else if (approval === 'pending') {
            query.isApproved = { $ne: true };
        }

        // Filter by active status
        if (status === 'active') {
            query.isActive = { $ne: false }; // true or undefined (for existing users without the field)
        } else if (status === 'inactive') {
            query.isActive = false;
        }
        // If status is 'all' or not specified, don't filter by isActive

        if (browseMatrixContext && req.user) {
            const accessMode = await getBrowseMatrixAccessMode();

            query._id = { $ne: req.user._id };
            query.isApproved = true;
            query.isActive = { $ne: false };

            if (role === 'admin') {
                query.role = '__browse_matrix_blocked__';
            } else if (!role) {
                query.role = { $ne: 'admin' };
            }

            if (accessMode === 'role_hierarchy') {
                query.roleLevel = { $lte: getUserRoleLevel(req.user) };
            }
        }

        const visibleUserQuery = excludeSystemUserAccounts(query);

        const total = await User.countDocuments(visibleUserQuery);
        const users = await User.find(visibleUserQuery)
            .select('-password')
            .populate('projectPosition', 'name')
            .populate('department', 'name')
            .populate({
                path: 'team',
                select: 'name section',
                populate: { path: 'section', select: 'name department' },
            })
            .sort({ firstName: 1, lastName: 1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        res.status(200).json({
            success: true,
            count: users.length,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
            data: users,
        });
    } catch (error) {
        console.error('GetUsers error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single user with skills
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const browseMatrixContext = isBrowseMatrixContext(req.query.context);
        const user = await getSafeUserById(req.params.id);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (browseMatrixContext && req.user) {
            const accessMode = await getBrowseMatrixAccessMode();

            if (!canBrowseMatrixUser(req.user, user, accessMode)) {
                res.status(403).json({ success: false, message: 'Not authorized to view this matrix' });
                return;
            }
        }

        // Get user's public skills
        const skills = await UserSkill.find({ user: req.params.id, isPublic: true, deletedAt: null })
            .populate({
                path: 'skill',
                populate: { path: 'category', select: 'name color icon' },
            })
            .populate('endorsements', 'firstName lastName avatar')
            .sort({ endorsementCount: -1 });

        res.status(200).json({
            success: true,
            data: {
                user,
                skills,
            },
        });
    } catch (error) {
        console.error('GetUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, title, bio, role, department, section, team, hireDate, projectPosition } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const { duplicateName } = await checkForDuplicateUser({
            firstName: firstName ?? user.firstName,
            lastName: lastName ?? user.lastName,
            excludeUserId: user._id,
        });

        if (duplicateName) {
            res.status(400).json({ success: false, message: 'A user with the same first and last name already exists.' });
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

        const previousRole = user.role;
        const actorName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'An admin';
        let roleName = resolvedAssignments.role;

        if (resolvedAssignments.role) {
            const existingRole = await Role.findOne({ key: resolvedAssignments.role, isActive: true });
            if (!existingRole) {
                res.status(400).json({ success: false, message: 'Role not found or inactive' });
                return;
            }
            user.role = resolvedAssignments.role;
            roleName = existingRole.name;
        }

        user.firstName = firstName ?? user.firstName;
        user.lastName = lastName ?? user.lastName;
        user.title = title;
        user.bio = bio;
        user.projectPosition = 'projectPosition' in req.body
            ? (resolvedAssignments.projectPosition as typeof user.projectPosition) || undefined
            : user.projectPosition;
        user.department = 'department' in req.body || 'section' in req.body || 'team' in req.body
            ? (resolvedAssignments.department as typeof user.department) || undefined
            : user.department;
        user.team = 'team' in req.body
            ? (resolvedAssignments.team as typeof user.team) || undefined
            : user.team;
        user.hireDate = hireDate || undefined;
        user.updatedBy = req.user?._id;

        await user.save();
        await user.populate('projectPosition', 'name');
        await user.populate('department', 'name');
        await user.populate({
            path: 'team',
            select: 'name section',
            populate: { path: 'section', select: 'name department' },
        });

        if (req.user && req.user._id.toString() !== user._id.toString()) {
            if (role && role !== previousRole) {
                await createNotificationForUser(
                    user._id.toString(),
                    'Role updated',
                    `${actorName} updated your role to ${roleName || role}.`,
                    'role_assigned',
                    req.user._id.toString()
                );
            } else {
                await createNotificationForUser(
                    user._id.toString(),
                    'Account details updated',
                    `${actorName} updated your account details.`,
                    'general',
                    req.user._id.toString()
                );
            }
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('UpdateUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const activeUserSkillIds = await UserSkill.find({ user: req.params.id, deletedAt: null }).distinct('_id');

        if (activeUserSkillIds.length > 0) {
            await Endorsement.updateMany(
                { userSkill: { $in: activeUserSkillIds }, deletedAt: null },
                buildSoftDeleteSetUpdate(req)
            );
        }

        await Endorsement.updateMany(
            { endorser: req.params.id, deletedAt: null },
            buildSoftDeleteSetUpdate(req)
        );

        await UserSkill.updateMany(
            { user: req.params.id, deletedAt: null },
            buildSoftDeleteSetUpdate(req)
        );

        await softDeleteDocument(user, req, {
            isActive: false,
            deactivatedAt: new Date(),
        });

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('DeleteUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Deactivate user (soft delete - retain data)
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin
export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (user.role === 'admin') {
            res.status(400).json({ success: false, message: 'Cannot deactivate admin users' });
            return;
        }

        user.isActive = false;
        user.deactivatedAt = new Date();
        user.updatedBy = req.user?._id;
        await user.save();

        if (req.user) {
            const actorName = `${req.user.firstName} ${req.user.lastName}`;
            await createNotificationForUser(
                user._id.toString(),
                'Account deactivated',
                `${actorName} deactivated your account.`,
                'general',
                req.user._id.toString()
            );
        }

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
            data: user,
        });
    } catch (error) {
        console.error('DeactivateUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reactivate user
// @route   PUT /api/users/:id/reactivate
// @access  Private/Admin
export const reactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        user.isActive = true;
        user.deactivatedAt = undefined;
        user.updatedBy = req.user?._id;
        await user.save();

        if (req.user) {
            const actorName = `${req.user.firstName} ${req.user.lastName}`;
            await createNotificationForUser(
                user._id.toString(),
                'Account reactivated',
                `${actorName} reactivated your account.`,
                'general',
                req.user._id.toString()
            );
        }

        res.status(200).json({
            success: true,
            message: 'User reactivated successfully',
            data: user,
        });
    } catch (error) {
        console.error('ReactivateUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long',
            });
            return;
        }

        const user = await User.findById(req.params.id).select('+password');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        user.password = newPassword;
        user.updatedBy = req.user?._id;
        await user.save();

        if (req.user) {
            const actorName = `${req.user.firstName} ${req.user.lastName}`;
            await createNotificationForUser(
                user._id.toString(),
                'Password reset',
                `${actorName} reset your account password.`,
                'general',
                req.user._id.toString()
            );
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
        });
    } catch (error) {
        console.error('ResetUserPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
