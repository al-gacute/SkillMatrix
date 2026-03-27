import { Request, Response } from 'express';
import { Department, Section, User, Team } from '../models';
import { AuthRequest } from '../middleware/auth';
import {
    addCreateAuditFields,
    addUpdateAuditFields,
    AUDIT_POPULATE,
    buildDeletedAtFilter,
    shouldIncludeDeleted,
    softDeleteDocument,
} from '../utils/audit';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const departments = await Department.find(buildDeletedAtFilter({}, includeDeleted))
            .populate('manager', 'firstName lastName email avatar')
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 });

        // Get member count for each department
        const departmentsWithCount = await Promise.all(
            departments.map(async (dept) => {
                const memberCount = await User.countDocuments({ department: dept._id });
                const sectionCount = await Section.countDocuments({ department: dept._id, deletedAt: null });
                const teamCount = await Team.countDocuments({ department: dept._id, deletedAt: null });
                return {
                    ...dept.toObject(),
                    memberCount,
                    sectionCount,
                    teamCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: departments.length,
            data: departmentsWithCount,
        });
    } catch (error) {
        console.error('GetDepartments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
export const getDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('manager', 'firstName lastName email avatar')
            .populate(AUDIT_POPULATE);

        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found' });
            return;
        }

        const members = await User.find({ department: req.params.id })
            .select('firstName lastName email avatar title')
            .sort({ firstName: 1 });

        const teams = await Team.find({ department: req.params.id, deletedAt: null })
            .populate('lead', 'firstName lastName')
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 });
        const sections = await Section.find({ department: req.params.id, deletedAt: null })
            .populate(AUDIT_POPULATE)
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: {
                ...department.toObject(),
                members,
                sections,
                teams,
            },
        });
    } catch (error) {
        console.error('GetDepartment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, manager } = req.body;

        const existingDepartment = await Department.findOne({ name, deletedAt: null });
        if (existingDepartment) {
            res.status(400).json({ success: false, message: 'Department already exists' });
            return;
        }

        const department = await Department.create(addCreateAuditFields({ name, description, manager }, req));
        await department.populate('manager', 'firstName lastName email avatar');
        await department.populate(AUDIT_POPULATE);

        res.status(201).json({
            success: true,
            data: department,
        });
    } catch (error) {
        console.error('CreateDepartment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, manager } = req.body;

        const department = await Department.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({ name, description, manager }, req),
            { new: true, runValidators: true }
        ).populate('manager', 'firstName lastName email avatar');
        await department?.populate(AUDIT_POPULATE);

        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: department,
        });
    } catch (error) {
        console.error('UpdateDepartment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const department = await Department.findOne({ _id: req.params.id, deletedAt: null });

        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found' });
            return;
        }

        const [memberCount, sectionCount, teamCount] = await Promise.all([
            User.countDocuments({ department: req.params.id }),
            Section.countDocuments({ department: req.params.id, deletedAt: null }),
            Team.countDocuments({ department: req.params.id, deletedAt: null }),
        ]);

        if (memberCount > 0 || sectionCount > 0 || teamCount > 0) {
            const blockers: string[] = [];

            if (sectionCount > 0) {
                blockers.push(`${sectionCount} section${sectionCount === 1 ? '' : 's'}`);
            }
            if (teamCount > 0) {
                blockers.push(`${teamCount} team${teamCount === 1 ? '' : 's'}`);
            }
            if (memberCount > 0) {
                blockers.push(`${memberCount} member${memberCount === 1 ? '' : 's'}`);
            }

            res.status(400).json({
                success: false,
                message: `Cannot delete department while it has assigned ${blockers.join(', ')}. Remove or reassign them first.`,
            });
            return;
        }

        await softDeleteDocument(department, req);

        res.status(200).json({
            success: true,
            message: 'Department deleted successfully',
        });
    } catch (error) {
        console.error('DeleteDepartment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
