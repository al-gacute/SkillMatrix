import { Request, Response } from 'express';
import { Department, Section, Team, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import {
    addCreateAuditFields,
    addUpdateAuditFields,
    AUDIT_POPULATE,
    buildDeletedAtFilter,
    shouldIncludeDeleted,
    softDeleteDocument,
} from '../utils/audit';
import { excludeSystemUserAccounts } from '../utils/systemUserFilter';

// @desc    Get all sections
// @route   GET /api/sections
// @access  Private
export const getSections = async (req: Request, res: Response): Promise<void> => {
    try {
        const { department } = req.query;
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const query = buildDeletedAtFilter({}, includeDeleted);

        if (department) {
            query.department = department;
        }

        const sections = await Section.find(query)
            .populate('department', 'name')
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 });

        const sectionsWithCounts = await Promise.all(
            sections.map(async (section) => {
                const sectionTeams = await Team.find({ section: section._id, deletedAt: null })
                    .select('_id members')
                    .lean();
                const teamIds = sectionTeams.map((team) => team._id);
                const userIdsFromTeamField = teamIds.length > 0
                    ? await User.find(excludeSystemUserAccounts({ team: { $in: teamIds } })).distinct('_id')
                    : [];
                const rawMemberIdsFromTeams = sectionTeams.flatMap((team) =>
                    (team.members || []).map((memberId) => String(memberId))
                );
                const userIdsFromMembersArray = rawMemberIdsFromTeams.length > 0
                    ? await User.find(excludeSystemUserAccounts({ _id: { $in: rawMemberIdsFromTeams } })).distinct('_id')
                    : [];
                const userCount = new Set([
                    ...userIdsFromTeamField.map((userId) => String(userId)),
                    ...userIdsFromMembersArray.map((userId) => String(userId)),
                ]).size;

                return {
                    ...section.toObject(),
                    teamCount: teamIds.length,
                    userCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: sections.length,
            data: sectionsWithCounts,
        });
    } catch (error) {
        console.error('GetSections error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create section
// @route   POST /api/sections
// @access  Private/Admin
export const createSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, department } = req.body;

        const departmentExists = await Department.findOne({ _id: department, deletedAt: null });
        if (!departmentExists) {
            res.status(400).json({ success: false, message: 'Department not found' });
            return;
        }

        const existingSection = await Section.findOne({ name, department, deletedAt: null });
        if (existingSection) {
            res.status(400).json({ success: false, message: 'Section already exists in this department' });
            return;
        }

        const section = await Section.create(addCreateAuditFields({ name, description, department }, req));
        await section.populate('department', 'name');
        await section.populate(AUDIT_POPULATE);

        res.status(201).json({
            success: true,
            data: section,
        });
    } catch (error) {
        console.error('CreateSection error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private/Admin
export const updateSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, department } = req.body;

        if (department) {
            const departmentExists = await Department.findOne({ _id: department, deletedAt: null });
            if (!departmentExists) {
                res.status(400).json({ success: false, message: 'Department not found' });
                return;
            }
        }

        const section = await Section.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({ name, description, department }, req),
            { new: true, runValidators: true }
        ).populate('department', 'name');
        await section?.populate(AUDIT_POPULATE);

        if (!section) {
            res.status(404).json({ success: false, message: 'Section not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: section,
        });
    } catch (error) {
        console.error('UpdateSection error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private/Admin
export const deleteSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const section = await Section.findOne({ _id: req.params.id, deletedAt: null });

        if (!section) {
            res.status(404).json({ success: false, message: 'Section not found' });
            return;
        }

        const sectionTeams = await Team.find({ section: section._id, deletedAt: null })
            .select('_id members')
            .lean();
        const teamIds = sectionTeams.map((team) => team._id);
        const userIdsFromTeamField = teamIds.length > 0
            ? await User.find(excludeSystemUserAccounts({ team: { $in: teamIds } })).distinct('_id')
            : [];
        const rawMemberIdsFromTeams = sectionTeams.flatMap((team) =>
            (team.members || []).map((memberId) => String(memberId))
        );
        const userIdsFromMembersArray = rawMemberIdsFromTeams.length > 0
            ? await User.find(excludeSystemUserAccounts({ _id: { $in: rawMemberIdsFromTeams } })).distinct('_id')
            : [];
        const assignedMemberCount = new Set([
            ...userIdsFromTeamField.map((userId) => String(userId)),
            ...userIdsFromMembersArray.map((userId) => String(userId)),
        ]).size;

        if (teamIds.length > 0 || assignedMemberCount > 0) {
            res.status(400).json({
                success: false,
                message: 'Section cannot be deleted while teams or members are assigned',
                data: {
                    teamCount: teamIds.length,
                    memberCount: assignedMemberCount,
                },
            });
            return;
        }

        await softDeleteDocument(section, req);

        res.status(200).json({
            success: true,
            message: 'Section deleted successfully',
        });
    } catch (error) {
        console.error('DeleteSection error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
