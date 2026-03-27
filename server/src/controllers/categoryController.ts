import { Request, Response } from 'express';
import { SkillCategory, Skill } from '../models';
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

// @desc    Get all skill categories
// @route   GET /api/categories
// @access  Private
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const categories = await SkillCategory.find(buildDeletedAtFilter({}, includeDeleted))
            .populate(AUDIT_POPULATE)
            .sort({ deletedAt: 1, name: 1 });

        // Get skill count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const skillCount = await Skill.countDocuments({ category: category._id, deletedAt: null });
                return {
                    ...category.toObject(),
                    skillCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categoriesWithCount,
        });
    } catch (error) {
        console.error('GetCategories error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
export const getCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await SkillCategory.findOne({ _id: req.params.id, deletedAt: null }).populate(AUDIT_POPULATE);

        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        const skills = await Skill.find({ category: req.params.id, deletedAt: null }).populate(AUDIT_POPULATE);

        res.status(200).json({
            success: true,
            data: {
                ...category.toObject(),
                skills,
            },
        });
    } catch (error) {
        console.error('GetCategory error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, color, icon } = req.body;

        const existingCategory = await SkillCategory.findOne({ name, deletedAt: null });
        if (existingCategory) {
            res.status(400).json({ success: false, message: 'Category already exists' });
            return;
        }

        const category = await SkillCategory.create(addCreateAuditFields({ name, description, color, icon }, req));
        await category.populate(AUDIT_POPULATE);
        await createUserNotifications(
            'New skill category added',
            `A new category, "${category.name}", is now available in SkillMatrix.`,
            req.user?._id ? String(req.user._id) : undefined
        );

        res.status(201).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('CreateCategory error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, color, icon } = req.body;

        const category = await SkillCategory.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({ name, description, color, icon }, req),
            { new: true, runValidators: true }
        ).populate(AUDIT_POPULATE);

        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('UpdateCategory error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const category = await SkillCategory.findOne({ _id: req.params.id, deletedAt: null });

        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        // Check if there are skills in this category
        const skillCount = await Skill.countDocuments({ category: req.params.id, deletedAt: null });
        if (skillCount > 0) {
            res.status(409).json({
                success: false,
                message: `Cannot delete category while ${skillCount} skill(s) are still assigned to it.`,
            });
            return;
        }

        await softDeleteDocument(category, req);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('DeleteCategory error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
