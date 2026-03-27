import { Request, Response } from 'express';
import { Skill, SkillCategory, UserSkill } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createUserNotifications } from './notificationController';
import {
    addCreateAuditFields,
    addUpdateAuditFields,
    AUDIT_POPULATE,
    buildDeletedAtFilter,
    shouldIncludeDeleted,
    softDeleteDocument,
} from '../utils/audit';

// @desc    Get all skills
// @route   GET /api/skills
// @access  Private
export const getSkills = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, category, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const query = buildDeletedAtFilter({}, includeDeleted);

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (category) {
            query.category = category;
        }

        const total = await Skill.countDocuments(query);
        const skills = await Skill.find(query)
            .populate('category', 'name color icon')
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const skillsWithCounts = await Promise.all(
            skills.map(async (skill) => {
                const assignedUserCount = await UserSkill.countDocuments({ skill: skill._id });
                return {
                    ...skill.toObject(),
                    assignedUserCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: skills.length,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
            data: skillsWithCounts,
        });
    } catch (error) {
        console.error('GetSkills error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single skill
// @route   GET /api/skills/:id
// @access  Private
export const getSkill = async (req: Request, res: Response): Promise<void> => {
    try {
        const skill = await Skill.findOne({ _id: req.params.id, deletedAt: null })
            .populate('category', 'name color icon')
            .populate(AUDIT_POPULATE);

        if (!skill) {
            res.status(404).json({ success: false, message: 'Skill not found' });
            return;
        }

        const assignedUserCount = await UserSkill.countDocuments({ skill: skill._id });

        res.status(200).json({
            success: true,
            data: {
                ...skill.toObject(),
                assignedUserCount,
            },
        });
    } catch (error) {
        console.error('GetSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create skill
// @route   POST /api/skills
// @access  Private/Admin
export const createSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, category } = req.body;

        // Check if category exists
        const categoryExists = await SkillCategory.findOne({ _id: category, deletedAt: null });
        if (!categoryExists) {
            res.status(400).json({ success: false, message: 'Category not found' });
            return;
        }

        // Check if skill already exists in category
        const existingSkill = await Skill.findOne({ name, category, deletedAt: null });
        if (existingSkill) {
            res.status(400).json({ success: false, message: 'Skill already exists in this category' });
            return;
        }

        const skill = await Skill.create(addCreateAuditFields({ name, description, category }, req));
        await skill.populate('category', 'name color icon');
        await skill.populate(AUDIT_POPULATE);
        const populatedCategory = skill.category as { _id?: unknown; name?: string } | string | undefined;
        const categoryName =
            populatedCategory && typeof populatedCategory !== 'string' && '_id' in populatedCategory
                ? populatedCategory.name
                : undefined;
        const categoryContext = categoryName ? ` under ${categoryName}` : '';

        await createUserNotifications(
            'New skill added',
            `A new skill, "${skill.name}", is now available${categoryContext}.`,
            req.user?._id ? String(req.user._id) : undefined
        );

        res.status(201).json({
            success: true,
            data: skill,
        });
    } catch (error) {
        console.error('CreateSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update skill
// @route   PUT /api/skills/:id
// @access  Private/Admin
export const updateSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, category } = req.body;

        const skill = await Skill.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({ name, description, category }, req),
            { new: true, runValidators: true }
        )
            .populate('category', 'name color icon')
            .populate(AUDIT_POPULATE);

        if (!skill) {
            res.status(404).json({ success: false, message: 'Skill not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: skill,
        });
    } catch (error) {
        console.error('UpdateSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete skill
// @route   DELETE /api/skills/:id
// @access  Private/Admin
export const deleteSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const skill = await Skill.findOne({ _id: req.params.id, deletedAt: null });

        if (!skill) {
            res.status(404).json({ success: false, message: 'Skill not found' });
            return;
        }

        const assignedUserCount = await UserSkill.countDocuments({ skill: req.params.id });

        if (assignedUserCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete skill while it is assigned to ${assignedUserCount} user(s). Remove or reassign them first.`,
                data: { assignedUserCount },
            });
            return;
        }

        await softDeleteDocument(skill, req);

        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully',
        });
    } catch (error) {
        console.error('DeleteSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get skill statistics
// @route   GET /api/skills/:id/stats
// @access  Private
export const getSkillStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const skillId = req.params.id;

        const stats = await UserSkill.aggregate([
            { $match: { skill: skillId } },
            {
                $group: {
                    _id: '$proficiencyLevel',
                    count: { $sum: 1 },
                },
            },
        ]);

        const totalUsers = await UserSkill.countDocuments({ skill: skillId });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                byProficiency: stats,
            },
        });
    } catch (error) {
        console.error('GetSkillStats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
