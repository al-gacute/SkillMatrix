import { Request, Response } from 'express';
import { AppSettings, BrowseMatrixAccessMode, Role, User } from '../models';
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
import { DEFAULT_BROWSE_MATRIX_ACCESS, getGlobalAppSettingsKey } from '../utils/browseMatrixAccess';

type OrganizationScope = 'department' | 'section' | 'team';

const normalizeOrganizationScopes = (value: unknown): OrganizationScope[] => {
    if (Array.isArray(value)) {
        return value
            .filter((item): item is OrganizationScope =>
                item === 'department' || item === 'section' || item === 'team'
            )
            .filter((item, index, items) => items.indexOf(item) === index);
    }

    if (value === 'department' || value === 'section' || value === 'team') {
        return [value];
    }

    return [];
};

const serializeRole = <T extends { organizationScopes?: OrganizationScope[]; organizationScope?: OrganizationScope }>(role: T) => {
    const organizationScopes = normalizeOrganizationScopes(
        role.organizationScopes && role.organizationScopes.length > 0
            ? role.organizationScopes
            : role.organizationScope
    );

    return {
        ...role,
        organizationScopes,
    };
};

const attachUserCounts = async <T extends { key: string }>(roles: T[]) => {
        const counts = await User.aggregate([
        {
            $match: {
                deletedAt: null,
            },
        },
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
            },
        },
    ]);

    const countMap = new Map<string, number>(
        counts.map((item) => [String(item._id), Number(item.count) || 0])
    );

    return roles.map((role) => ({
        ...role,
        userCount: countMap.get(role.key) || 0,
    }));
};

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private
export const getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { includeInactive } = req.query;
        const includeDeleted = shouldIncludeDeleted(req.query.includeDeleted);

        const query = buildDeletedAtFilter({}, includeDeleted);
        if (!includeInactive) {
            query.isActive = true;
        }

        const roles = await Role.find(query)
            .populate(AUDIT_POPULATE)
            .sort({ deletedAt: 1, level: 1 })
            .lean();
        const rolesWithCounts = await attachUserCounts(roles.map(serializeRole));

        res.status(200).json({
            success: true,
            count: rolesWithCounts.length,
            data: rolesWithCounts,
        });
    } catch (error) {
        console.error('GetRoles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get browse matrix access setting
// @route   GET /api/roles/browse-matrix-access
// @access  Private
export const getBrowseMatrixAccessSetting = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await AppSettings.findOne({ key: getGlobalAppSettingsKey() }).lean();

        res.status(200).json({
            success: true,
            data: {
                browseMatrixAccess: settings?.browseMatrixAccess || DEFAULT_BROWSE_MATRIX_ACCESS,
            },
        });
    } catch (error) {
        console.error('GetBrowseMatrixAccessSetting error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update browse matrix access setting
// @route   PUT /api/roles/browse-matrix-access
// @access  Private/Admin
export const updateBrowseMatrixAccessSetting = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { browseMatrixAccess } = req.body as { browseMatrixAccess?: BrowseMatrixAccessMode };

        if (browseMatrixAccess !== 'public' && browseMatrixAccess !== 'role_hierarchy') {
            res.status(400).json({
                success: false,
                message: 'Browse Matrix access must be either public or role_hierarchy',
            });
            return;
        }

        const settings = await AppSettings.findOneAndUpdate(
            { key: getGlobalAppSettingsKey() },
            addUpdateAuditFields(
                {
                    key: getGlobalAppSettingsKey(),
                    browseMatrixAccess,
                },
                req
            ),
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            }
        );

        if (!settings) {
            res.status(500).json({ success: false, message: 'Failed to save Browse Matrix access setting' });
            return;
        }

        if (!settings.createdBy && req.user?._id) {
            settings.createdBy = req.user._id;
            await settings.save();
        }

        res.status(200).json({
            success: true,
            data: {
                browseMatrixAccess: settings.browseMatrixAccess,
            },
        });
    } catch (error) {
        console.error('UpdateBrowseMatrixAccessSetting error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private
export const getRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const role = await Role.findOne({ _id: req.params.id }).populate(AUDIT_POPULATE).lean();

        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }

        const [roleWithCounts] = await attachUserCounts([serializeRole(role)]);

        res.status(200).json({
            success: true,
            data: roleWithCounts,
        });
    } catch (error) {
        console.error('GetRole error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create role
// @route   POST /api/roles
// @access  Private/Admin
export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, key, level, organizationScopes, organizationScope, description } = req.body;
        const normalizedScopes = key?.toLowerCase() === 'member'
            ? []
            : normalizeOrganizationScopes(organizationScopes ?? organizationScope);

        // Check if role key already exists
        const existingRole = await Role.findOne({ key: key.toLowerCase(), deletedAt: null });
        if (existingRole) {
            res.status(400).json({ success: false, message: 'Role with this key already exists' });
            return;
        }

        const role = await Role.create(addCreateAuditFields({
            name,
            key: key.toLowerCase(),
            level,
            organizationScopes: normalizedScopes,
            description,
            isSystem: false,
            isActive: true,
        }, req));
        await role.populate(AUDIT_POPULATE);

        res.status(201).json({
            success: true,
            data: serializeRole(role.toObject()),
        });
    } catch (error) {
        console.error('CreateRole error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private/Admin
export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, level, organizationScopes, organizationScope, description, isActive } = req.body;

        const role = await Role.findOne({ _id: req.params.id, deletedAt: null });

        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }

        // Don't allow editing system roles' key
        if (role.isSystem && req.body.key && req.body.key !== role.key) {
            res.status(400).json({ success: false, message: 'Cannot change key of system roles' });
            return;
        }

        const normalizedScopes = role.key === 'member'
            ? []
            : normalizeOrganizationScopes(organizationScopes ?? organizationScope);

        const updatedRole = await Role.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            addUpdateAuditFields({
                name,
                level,
                organizationScopes: normalizedScopes,
                $unset: { organizationScope: 1 },
                description,
                isActive,
            }, req),
            { new: true, runValidators: true }
        ).populate(AUDIT_POPULATE);

        res.status(200).json({
            success: true,
            data: updatedRole ? serializeRole(updatedRole.toObject()) : updatedRole,
        });
    } catch (error) {
        console.error('UpdateRole error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const role = await Role.findOne({ _id: req.params.id, deletedAt: null });

        if (!role) {
            res.status(404).json({ success: false, message: 'Role not found' });
            return;
        }

        // Only member and admin roles are protected
        if (role.key === 'member' || role.key === 'admin') {
            res.status(400).json({ success: false, message: 'Cannot delete Member or Admin roles' });
            return;
        }

        // Check if any users have this role
        const usersWithRole = await User.countDocuments({ role: role.key });
        if (usersWithRole > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
            });
            return;
        }

        await softDeleteDocument(role, req, { isActive: false });

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully',
        });
    } catch (error) {
        console.error('DeleteRole error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Initialize default roles
// @route   POST /api/roles/init
// @access  Private/Admin
export const initializeRoles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const defaultRoles = [
            { name: 'Member', key: 'member', level: 1, organizationScopes: [], description: 'Regular team member (default for all users)', isSystem: true },
            { name: 'Team Leader', key: 'team_leader', level: 2, organizationScopes: ['team'], description: 'Leads a team', isSystem: false },
            { name: 'Group Leader', key: 'group_leader', level: 3, organizationScopes: ['section'], description: 'Leads multiple teams', isSystem: false },
            { name: 'Department Manager', key: 'department_manager', level: 4, organizationScopes: ['department'], description: 'Manages a department', isSystem: false },
            { name: 'Division Manager', key: 'division_manager', level: 5, organizationScopes: [], description: 'Manages a division', isSystem: false },
            { name: 'Admin', key: 'admin', level: 100, organizationScopes: [], description: 'System administrator', isSystem: true },
        ];

        for (const roleData of defaultRoles) {
            await Role.findOneAndUpdate(
                { key: roleData.key },
                {
                    ...roleData,
                    $unset: { organizationScope: 1 },
                    deletedAt: null,
                    deletedBy: undefined,
                    ...(req.user?._id ? { updatedBy: req.user._id, createdBy: req.user._id } : {}),
                },
                { upsert: true, new: true }
            );
        }

        const roles = await Role.find({ deletedAt: null })
            .populate(AUDIT_POPULATE)
            .sort({ level: 1 })
            .lean();
        const rolesWithCounts = await attachUserCounts(roles.map(serializeRole));

        res.status(200).json({
            success: true,
            message: 'Roles initialized successfully',
            data: rolesWithCounts,
        });
    } catch (error) {
        console.error('InitializeRoles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reorder roles (update levels)
// @route   PUT /api/roles/reorder
// @access  Private/Admin
export const reorderRoles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { roleOrder } = req.body; // Array of { id, level }

        if (!Array.isArray(roleOrder)) {
            res.status(400).json({ success: false, message: 'roleOrder must be an array' });
            return;
        }

        for (const item of roleOrder) {
            await Role.findOneAndUpdate(
                { _id: item.id, deletedAt: null },
                addUpdateAuditFields({ level: item.level }, req)
            );
        }

        // Update user roleLevels based on new role levels
        const roles = await Role.find();
        for (const role of roles) {
            await User.updateMany(
                { role: role.key },
                buildAuditSetUpdate({ roleLevel: role.level }, req)
            );
        }

        const updatedRoles = await Role.find({ isActive: true, deletedAt: null })
            .populate(AUDIT_POPULATE)
            .sort({ level: 1 })
            .lean();
        const updatedRolesWithCounts = await attachUserCounts(updatedRoles.map(serializeRole));

        res.status(200).json({
            success: true,
            data: updatedRolesWithCounts,
        });
    } catch (error) {
        console.error('ReorderRoles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
