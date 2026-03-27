import { Request, Response } from 'express';
import { ProjectPosition } from '../models';
import { AuthRequest } from '../middleware/auth';
import {
    addCreateAuditFields,
    addUpdateAuditFields,
    AUDIT_POPULATE,
    buildDeletedAtFilter,
    shouldIncludeDeleted,
    softDeleteDocument,
} from '../utils/audit';

const normalizeName = (name: string) => name.trim();

// @desc    Get all project positions
// @route   GET /api/project-positions
// @access  Private
export const getProjectPositions = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);
        const projectPositions = await ProjectPosition.find(buildDeletedAtFilter({}, includeDeleted))
            .populate(AUDIT_POPULATE)
            .sort({ deletedAt: 1, name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: projectPositions.length,
            data: projectPositions,
        });
    } catch (error) {
        console.error('GetProjectPositions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create project position
// @route   POST /api/project-positions
// @access  Private/Admin
export const createProjectPosition = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const normalizedName = normalizeName(name || '');

        if (!normalizedName) {
            res.status(400).json({ success: false, message: 'Project position name is required' });
            return;
        }

        const existingProjectPosition = await ProjectPosition.findOne({
            deletedAt: null,
            name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (existingProjectPosition) {
            res.status(400).json({ success: false, message: 'Project position already exists' });
            return;
        }

        const projectPosition = await ProjectPosition.create(
            addCreateAuditFields(
                {
                    name: normalizedName,
                    description: description?.trim?.() || '',
                },
                req
            )
        );
        await projectPosition.populate(AUDIT_POPULATE);

        res.status(201).json({
            success: true,
            data: projectPosition,
        });
    } catch (error) {
        console.error('CreateProjectPosition error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update project position
// @route   PUT /api/project-positions/:id
// @access  Private/Admin
export const updateProjectPosition = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const normalizedName = normalizeName(name || '');

        if (!normalizedName) {
            res.status(400).json({ success: false, message: 'Project position name is required' });
            return;
        }

        const duplicateProjectPosition = await ProjectPosition.findOne({
            _id: { $ne: req.params.id },
            deletedAt: null,
            name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (duplicateProjectPosition) {
            res.status(400).json({ success: false, message: 'Project position already exists' });
            return;
        }

        const projectPosition = await ProjectPosition.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields(
                {
                    name: normalizedName,
                    description: description?.trim?.() || '',
                },
                req
            ),
            { new: true, runValidators: true }
        ).populate(AUDIT_POPULATE);

        if (!projectPosition) {
            res.status(404).json({ success: false, message: 'Project position not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: projectPosition,
        });
    } catch (error) {
        console.error('UpdateProjectPosition error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete project position
// @route   DELETE /api/project-positions/:id
// @access  Private/Admin
export const deleteProjectPosition = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const projectPosition = await ProjectPosition.findOne({ _id: req.params.id, deletedAt: null });

        if (!projectPosition) {
            res.status(404).json({ success: false, message: 'Project position not found' });
            return;
        }

        await softDeleteDocument(projectPosition, req);

        res.status(200).json({
            success: true,
            message: 'Project position deleted successfully',
        });
    } catch (error) {
        console.error('DeleteProjectPosition error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
