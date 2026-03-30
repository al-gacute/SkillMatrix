import { Request, Response } from 'express';
import { Section, Team, User, UserSkill } from '../models';
import { AuthRequest } from '../middleware/auth';
import {
    addCreateAuditFields,
    addUpdateAuditFields,
    AUDIT_POPULATE,
    buildAuditSetUpdate,
    buildDeletedAtFilter,
    shouldIncludeDeleted,
    softDeleteDocument,
} from '../utils/audit';
import { excludeSystemUserAccounts } from '../utils/systemUserFilter';

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req: Request, res: Response): Promise<void> => {
    try {
        const { department, section } = req.query;
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const query = buildDeletedAtFilter({}, includeDeleted);

        if (department) {
            query.department = department;
        }

        if (section) {
            query.section = section;
        }

        const teams = await Team.find(query)
            .populate('department', 'name')
            .populate('section', 'name department')
            .populate('lead', 'firstName lastName email avatar')
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 });

        // Get member count for each team
        const teamsWithCount = await Promise.all(
            teams.map(async (team) => {
                const memberCount = await User.countDocuments(excludeSystemUserAccounts({ team: team._id }));
                return {
                    ...team.toObject(),
                    memberCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: teams.length,
            data: teamsWithCount,
        });
    } catch (error) {
        console.error('GetTeams error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single team with members and skill distribution
// @route   GET /api/teams/:id
// @access  Private
export const getTeam = async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await Team.findOne({ _id: req.params.id, deletedAt: null })
            .populate('department', 'name')
            .populate({
                path: 'section',
                select: 'name department',
                populate: { path: 'department', select: 'name' },
            })
            .populate('lead', 'firstName lastName email avatar title')
            .populate(AUDIT_POPULATE);

        if (!team) {
            res.status(404).json({ success: false, message: 'Team not found' });
            return;
        }

        const members = await User.find(excludeSystemUserAccounts({ team: req.params.id }))
            .select('firstName lastName email avatar title projectPosition')
            .populate('projectPosition', 'name')
            .sort({ firstName: 1 });

        // Get skill distribution for the team
        const memberIds = members.map((m) => m._id);
        const teamSkills = await UserSkill.aggregate([
            { $match: { user: { $in: memberIds }, isPublic: true } },
            {
                $lookup: {
                    from: 'skills',
                    localField: 'skill',
                    foreignField: '_id',
                    as: 'skillInfo',
                },
            },
            { $unwind: '$skillInfo' },
            {
                $lookup: {
                    from: 'skillcategories',
                    localField: 'skillInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: {
                        skillId: '$skill',
                        skillName: '$skillInfo.name',
                        categoryName: '$categoryInfo.name',
                        categoryColor: '$categoryInfo.color',
                    },
                    count: { $sum: 1 },
                    avgExperience: { $avg: '$yearsOfExperience' },
                    proficiencyLevels: { $push: '$proficiencyLevel' },
                },
            },
            { $sort: { count: -1 } },
        ]);

        res.status(200).json({
            success: true,
            data: {
                ...team.toObject(),
                members,
                skillDistribution: teamSkills,
            },
        });
    } catch (error) {
        console.error('GetTeam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Private/Admin
export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, department, section, lead } = req.body;

        if (section) {
            const existingSection = await Section.findOne({ _id: section, deletedAt: null });
            if (!existingSection) {
                res.status(400).json({ success: false, message: 'Section not found' });
                return;
            }

            if (String(existingSection.department) !== String(department)) {
                res.status(400).json({ success: false, message: 'Section does not belong to the selected department' });
                return;
            }
        }

        const existingTeam = await Team.findOne({ name, department, section: section || null, deletedAt: null });
        if (existingTeam) {
            res.status(400).json({ success: false, message: 'Team already exists in this section' });
            return;
        }

        const team = await Team.create(addCreateAuditFields({ name, description, department, section, lead }, req));
        await team.populate('department', 'name');
        await team.populate({
            path: 'section',
            select: 'name department',
            populate: { path: 'department', select: 'name' },
        });
        await team.populate('lead', 'firstName lastName email avatar');
        await team.populate(AUDIT_POPULATE);

        res.status(201).json({
            success: true,
            data: team,
        });
    } catch (error) {
        console.error('CreateTeam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
export const updateTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, department, section, lead } = req.body;

        if (section) {
            const existingSection = await Section.findOne({ _id: section, deletedAt: null });
            if (!existingSection) {
                res.status(400).json({ success: false, message: 'Section not found' });
                return;
            }

            if (department && String(existingSection.department) !== String(department)) {
                res.status(400).json({ success: false, message: 'Section does not belong to the selected department' });
                return;
            }
        }

        const team = await Team.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({ name, description, department, section, lead }, req),
            { new: true, runValidators: true }
        )
            .populate('department', 'name')
            .populate({
                path: 'section',
                select: 'name department',
                populate: { path: 'department', select: 'name' },
            })
            .populate('lead', 'firstName lastName email avatar')
            .populate(AUDIT_POPULATE);

        if (!team) {
            res.status(404).json({ success: false, message: 'Team not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: team,
        });
    } catch (error) {
        console.error('UpdateTeam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
export const deleteTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.findOne({ _id: req.params.id, deletedAt: null });

        if (!team) {
            res.status(404).json({ success: false, message: 'Team not found' });
            return;
        }

        const memberCount = await User.countDocuments(excludeSystemUserAccounts({ team: req.params.id }));

        if (memberCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete team while it has ${memberCount} assigned member${memberCount === 1 ? '' : 's'}. Remove or reassign them first.`,
                data: { memberCount },
            });
            return;
        }

        await softDeleteDocument(team, req);

        res.status(200).json({
            success: true,
            message: 'Team deleted successfully',
        });
    } catch (error) {
        console.error('DeleteTeam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add member to team
// @route   POST /api/teams/:id/members
// @access  Private/Admin
export const addTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.body;

        const team = await Team.findById(req.params.id);
        if (!team) {
            res.status(404).json({ success: false, message: 'Team not found' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            buildAuditSetUpdate({ team: req.params.id, department: team.department }, req),
            { new: true }
        ).select('firstName lastName email avatar title');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('AddTeamMember error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private/Admin
export const removeTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                $unset: { team: 1 },
                ...buildAuditSetUpdate({}, req),
            },
            { new: true }
        ).select('firstName lastName email avatar title');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Member removed from team',
        });
    } catch (error) {
        console.error('RemoveTeamMember error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
