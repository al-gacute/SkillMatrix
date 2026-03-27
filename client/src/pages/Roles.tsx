import React, { useEffect, useState } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowsUpDownIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';
import { roleService, Role, OrganizationScope, BrowseMatrixAccessMode } from '../services/roleService';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';

const ORGANIZATION_SCOPE_LABELS = {
    department: 'Department',
    section: 'Section',
    team: 'Team',
} as const;

const getOrganizationScopes = (role: Pick<Role, 'organizationScopes'>) =>
    role.organizationScopes || [];

const Roles: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        level: 1,
        organizationScopes: [] as OrganizationScope[],
        description: '',
        isActive: true,
    });
    const [saving, setSaving] = useState(false);
    const [browseMatrixAccess, setBrowseMatrixAccess] = useState<BrowseMatrixAccessMode>('public');
    const [browseMatrixSaving, setBrowseMatrixSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchRoles = async () => {
        try {
            const [rolesResponse, browseMatrixAccessResponse] = await Promise.all([
                roleService.getRoles(true),
                roleService.getBrowseMatrixAccessSetting(),
            ]);

            if (rolesResponse.success) {
                setRoles(rolesResponse.data || []);
            }

            if (browseMatrixAccessResponse.success && browseMatrixAccessResponse.data) {
                setBrowseMatrixAccess(browseMatrixAccessResponse.data.browseMatrixAccess);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleInitializeRoles = async () => {
        try {
            setLoading(true);
            const response = await roleService.initializeRoles();
            if (response.success) {
                setRoles(response.data || []);
            }
        } catch (error) {
            console.error('Failed to initialize roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            key: '',
            level: roles.length > 0 ? Math.max(...roles.filter(r => r.key !== 'admin').map(r => r.level)) + 1 : 1,
            organizationScopes: [],
            description: '',
            isActive: true,
        });
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            key: role.key,
            level: role.level,
            organizationScopes: getOrganizationScopes(role),
            description: role.description || '',
            isActive: role.isActive ?? true,
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const organizationScopes = formData.key === 'member' ? [] : formData.organizationScopes;

        try {
            if (editingRole) {
                const response = await roleService.updateRole(editingRole._id, {
                    name: formData.name,
                    level: formData.level,
                    organizationScopes,
                    description: formData.description,
                    isActive: formData.isActive,
                });
                if (response.success) {
                    await fetchRoles();
                    setIsModalOpen(false);
                    setSuccessMessage(`${formData.name} was updated successfully.`);
                } else {
                    setError(response.message || 'Failed to update role');
                }
            } else {
                const response = await roleService.createRole({
                    ...formData,
                    organizationScopes,
                });
                if (response.success) {
                    await fetchRoles();
                    setIsModalOpen(false);
                    setSuccessMessage(`${formData.name} was created successfully.`);
                } else {
                    setError(response.message || 'Failed to create role');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;
        try {
            setError('');
            const deletedName = roleToDelete.name;
            const response = await roleService.deleteRole(roleToDelete._id);
            if (response.success) {
                setRoleToDelete(null);
                await fetchRoles();
                setSuccessMessage(`${deletedName} was deleted successfully.`);
            } else {
                setError(response.message || 'Failed to delete role');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete role');
        }
    };

    const handleBrowseMatrixAccessChange = async (nextAccess: BrowseMatrixAccessMode) => {
        if (browseMatrixSaving || nextAccess === browseMatrixAccess) {
            return;
        }

        try {
            setBrowseMatrixSaving(true);
            setError('');
            const response = await roleService.updateBrowseMatrixAccessSetting(nextAccess);

            if (response.success && response.data) {
                setBrowseMatrixAccess(response.data.browseMatrixAccess);
                setSuccessMessage(
                    response.data.browseMatrixAccess === 'public'
                        ? 'Browse Matrix is now public for members.'
                        : 'Browse Matrix now follows the role hierarchy.'
                );
            } else {
                setError(response.message || 'Failed to update Browse Matrix access.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update Browse Matrix access.');
        } finally {
            setBrowseMatrixSaving(false);
        }
    };

    const moveRole = async (index: number, direction: 'up' | 'down') => {
        const nonAdminRoles = roles.filter(r => r.key !== 'admin');
        const adminRole = roles.find(r => r.key === 'admin');

        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === nonAdminRoles.length - 1) return;

        const newRoles = [...nonAdminRoles];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newRoles[index], newRoles[targetIndex]] = [newRoles[targetIndex], newRoles[index]];

        // Reassign levels
        const roleOrder = newRoles.map((role, idx) => ({
            id: role._id,
            level: idx + 1,
        }));

        try {
            const response = await roleService.reorderRoles(roleOrder);
            if (response.success) {
                const updatedRoles = response.data || [];
                if (adminRole) {
                    updatedRoles.push(adminRole);
                }
                setRoles(updatedRoles.sort((a, b) => a.level - b.level));
            }
        } catch (error) {
            console.error('Failed to reorder roles:', error);
        }
    };

    const isMemberRoleForm = formData.key === 'member';

    const toggleOrganizationScope = (scope: OrganizationScope) => {
        setFormData((current) => ({
            ...current,
            organizationScopes: current.organizationScopes.includes(scope)
                ? current.organizationScopes.filter((item) => item !== scope)
                : [...current.organizationScopes, scope],
        }));
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const nonAdminRoles = roles.filter(r => r.key !== 'admin').sort((a, b) => a.level - b.level);
    const adminRole = roles.find(r => r.key === 'admin');
    const deleteBlocked = !!roleToDelete && (roleToDelete.userCount ?? 0) > 0;
    const deleteBlockMessage = roleToDelete
        ? `This role is still assigned to ${roleToDelete.userCount ?? 0} member(s). Remove or reassign them first.`
        : '';

    return (
        <div className="space-y-6">
            {error && !isModalOpen && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Role Hierarchy</h1>
                    <p className="text-gray-500 mt-1">Manage organizational roles and their hierarchy levels</p>
                </div>
                <div className="flex gap-2">
                    {roles.length === 0 && (
                        <button onClick={handleInitializeRoles} className="btn btn-secondary">
                            Initialize Default Roles
                        </button>
                    )}
                    <button
                        onClick={() => setIsReorderMode(!isReorderMode)}
                        className={`btn ${isReorderMode ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <ArrowsUpDownIcon className="h-5 w-5 mr-2" />
                        {isReorderMode ? 'Done Reordering' : 'Reorder'}
                    </button>
                    <button onClick={openCreateModal} className="btn btn-primary">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Role
                    </button>
                </div>
            </div>

            {/* Hierarchy Visualization */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hierarchy Levels</h2>
                <div className="space-y-2">
                    {/* Admin role at top */}
                    {adminRole && (
                        <div className="flex items-center gap-4 p-4 bg-gray-800 text-white rounded-lg">
                            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
                                <ShieldCheckIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{adminRole.name}</span>
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                                        {adminRole.userCount ?? 0} user{(adminRole.userCount ?? 0) === 1 ? '' : 's'}
                                    </span>
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">System</span>
                                </div>
                                <p className="text-sm text-gray-300">{adminRole.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Other roles */}
                    {nonAdminRoles.map((role, index) => (
                        <div
                            key={role._id}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${role.isActive
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-50 border-gray-200 opacity-60'
                                } ${isReorderMode ? 'cursor-move' : ''}`}
                        >
                            {isReorderMode && (
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => moveRole(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => moveRole(index, 'down')}
                                        disabled={index === nonAdminRoles.length - 1}
                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                    >
                                        ▼
                                    </button>
                                </div>
                            )}
                            <div
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold"
                            >
                                {role.level}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{role.name}</span>
                                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                        {role.userCount ?? 0} user{(role.userCount ?? 0) === 1 ? '' : 's'}
                                    </span>
                                    {role.key !== 'member' && getOrganizationScopes(role).length === 0 && (
                                        <span className="text-xs text-gray-500">
                                            Organization not assigned
                                        </span>
                                    )}
                                    {getOrganizationScopes(role).map((scope) => (
                                        <span key={`${role._id}-${scope}`} className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                                            {ORGANIZATION_SCOPE_LABELS[scope]}
                                        </span>
                                    ))}
                                    {role.isSystem && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                            System
                                        </span>
                                    )}
                                    {!role.isActive && (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                            </div>
                            {!isReorderMode && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(role)}
                                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    {role.key !== 'member' && role.key !== 'admin' && (
                                        <button
                                            onClick={() => setRoleToDelete(role)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Browse Matrix Access</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Choose whether Browse Matrix is public or follows the role hierarchy.
                        </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                        <button
                            type="button"
                            onClick={() => handleBrowseMatrixAccessChange('public')}
                            disabled={browseMatrixSaving}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                browseMatrixAccess === 'public'
                                    ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200'
                                    : 'text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900'
                            } ${browseMatrixSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                            <GlobeAltIcon className="h-4 w-4" />
                            Public
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBrowseMatrixAccessChange('role_hierarchy')}
                            disabled={browseMatrixSaving}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                browseMatrixAccess === 'role_hierarchy'
                                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                            } ${browseMatrixSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                            <LockClosedIcon className="h-4 w-4" />
                            Follow Role Hierarchy
                        </button>
                    </div>
                </div>
                <div
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                        browseMatrixAccess === 'public'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}
                >
                    {browseMatrixAccess === 'public'
                        ? 'Members can browse any other non-admin member matrix.'
                        : 'Members can browse only other non-admin members at the same role level or lower.'}
                </div>
            </div>

            {/* Info Card */}
            <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">How Role Hierarchy Works</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Higher level roles have more permissions and oversight</li>
                    <li>• Users can only assess or manage users with lower role levels</li>
                    <li>• Member and Admin roles cannot be deleted</li>
                    <li>• You can add custom roles to fit your organization structure</li>
                    <li>• Use reorder mode to change the hierarchy order</li>
                </ul>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRole ? 'Edit Role' : 'Create New Role'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input w-full"
                            placeholder="e.g., Senior Manager"
                            required
                        />
                    </div>

                    {!editingRole && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role Key
                            </label>
                            <input
                                type="text"
                                value={formData.key}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    key: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                })}
                                className="input w-full font-mono"
                                placeholder="e.g., senior_manager"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Unique identifier (lowercase, no spaces)
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hierarchy Level
                        </label>
                        <input
                            type="number"
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                            className="input w-full"
                            min="1"
                            max="99"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Higher levels have more authority (Admin is always highest)
                        </p>
                    </div>

                    {!isMemberRoleForm && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Organization Management
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {Object.entries(ORGANIZATION_SCOPE_LABELS).map(([value, label]) => {
                                    const scope = value as OrganizationScope;
                                    const selected = formData.organizationScopes.includes(scope);

                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => toggleOrganizationScope(scope)}
                                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                                selected
                                                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:bg-cyan-50/50'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Select one or more organization layers this role can manage.
                            </p>
                        </div>
                    )}

                    {isMemberRoleForm && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <p className="text-sm font-medium text-gray-700">Organization Management</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Member is the default role, so no organization assignment is needed here.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input w-full"
                            rows={2}
                            placeholder="Brief description of this role's responsibilities"
                        />
                    </div>

                    {editingRole && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Active Status
                                </label>
                                <p className="text-xs text-gray-500">Inactive roles cannot be assigned to users</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Role"
                message={deleteBlocked
                    ? deleteBlockMessage
                    : roleToDelete ? `Are you sure you want to delete the "${roleToDelete.name}" role?` : ''}
                confirmLabel="Delete"
                confirmDisabled={deleteBlocked}
            />

            <SuccessDialog
                isOpen={!!successMessage}
                onClose={() => setSuccessMessage('')}
                title="Action Completed"
                message={successMessage}
            />
        </div>
    );
};

export default Roles;
