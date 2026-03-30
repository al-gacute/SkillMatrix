import React, { useEffect, useState } from 'react';
import { PlusIcon, BuildingOfficeIcon, PencilIcon, TrashIcon, RectangleStackIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { departmentService, sectionService, teamService } from '../services';
import { Department, Section, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';

const Departments: React.FC = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [filters, setFilters] = useState({
        department: '',
        section: '',
        team: '',
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const isAdmin = user?.role === 'admin';

    const fetchData = async () => {
        try {
            const [departmentRes, sectionRes, teamRes] = await Promise.all([
                departmentService.getDepartments(),
                sectionService.getSections(),
                teamService.getTeams(),
            ]);
            if (departmentRes.success) {
                setDepartments(departmentRes.data || []);
            }
            if (sectionRes.success) {
                setSections(sectionRes.data || []);
            }
            if (teamRes.success) {
                setTeams(teamRes.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (department?: Department) => {
        setEditingDepartment(department || null);
        setFormData({
            name: department?.name || '',
            description: department?.description || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDepartment) {
                await departmentService.updateDepartment(editingDepartment._id, formData);
                setSuccessMessage(`${formData.name} was updated successfully.`);
            } else {
                await departmentService.createDepartment(formData);
                setSuccessMessage(`${formData.name} was created successfully.`);
            }
            setIsModalOpen(false);
            setFormData({ name: '', description: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to save department:', error);
        }
    };

    const handleDelete = async () => {
        if (!departmentToDelete) return;
        try {
            const deletedName = departmentToDelete.name;
            await departmentService.deleteDepartment(departmentToDelete._id);
            setDepartmentToDelete(null);
            setSuccessMessage(`${deletedName} was deleted successfully.`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete department:', error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const getCountBadgeClass = (count: number) =>
        count === 0
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700';

    const getDepartmentSections = (departmentId: string) =>
        sections.filter((section) => {
            if (section.deletedAt) return false;
            const sectionDepartmentId =
                typeof section.department === 'string'
                    ? section.department
                    : section.department?._id;
            return sectionDepartmentId === departmentId;
        });

    const getDepartmentTeams = (departmentId: string) =>
        teams.filter((team) => {
            if (team.deletedAt) return false;
            const teamDepartmentId =
                typeof team.department === 'string'
                    ? team.department
                    : team.department?._id;
            return teamDepartmentId === departmentId;
        });

    const filteredSections = sections.filter((section) => {
        if (!filters.department) return true;
        const departmentId =
            typeof section.department === 'string' ? section.department : section.department?._id;
        return departmentId === filters.department;
    });

    const filteredTeams = teams.filter((team) => {
        const departmentId =
            typeof team.department === 'string' ? team.department : team.department?._id;
        const sectionId =
            typeof team.section === 'string' ? team.section : team.section?._id;

        if (filters.department && departmentId !== filters.department) {
            return false;
        }

        if (filters.section && sectionId !== filters.section) {
            return false;
        }

        return true;
    });

    const filteredDepartments = departments.filter((department) => {
        const departmentSections = getDepartmentSections(department._id);
        const departmentTeams = getDepartmentTeams(department._id);

        if (filters.department && department._id !== filters.department) {
            return false;
        }

        if (filters.section && !departmentSections.some((section) => section._id === filters.section)) {
            return false;
        }

        if (filters.team && !departmentTeams.some((team) => team._id === filters.team)) {
            return false;
        }

        return true;
    });

    const clearFilters = () => {
        setFilters({
            department: '',
            section: '',
            team: '',
        });
    };

    const deleteBlocked = !!departmentToDelete && (
        (departmentToDelete.memberCount || 0) > 0 ||
        (departmentToDelete.sectionCount || 0) > 0 ||
        (departmentToDelete.teamCount || 0) > 0
    );

    const deleteBlockMessage = departmentToDelete
        ? `This department still has ${departmentToDelete.sectionCount || 0} section(s), ${departmentToDelete.teamCount || 0} team(s), and ${departmentToDelete.memberCount || 0} member(s) assigned. Remove or reassign them first.`
        : '';

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 -mt-4 sm:-mt-6 lg:-mt-8 space-y-4 border-b border-gray-200">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
                        <p className="text-gray-500 mt-1">Manage your organization's departments</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => openModal()} className="btn-primary">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Department
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                    <select
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value, section: '', team: '' })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Departments</option>
                        {departments.map((department) => (
                            <option key={department._id} value={department._id}>
                                {department.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.section}
                        onChange={(e) => setFilters({ ...filters, section: e.target.value, team: '' })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Sections</option>
                        {filteredSections.map((section) => (
                            <option key={section._id} value={section._id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.team}
                        onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Teams</option>
                        {filteredTeams.map((team) => (
                            <option key={team._id} value={team._id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                    {(filters.department || filters.section || filters.team) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {filteredDepartments.length === 0 ? (
                <div className="card text-center py-12">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">
                        {departments.length === 0 ? 'No departments yet' : 'No departments match these filters'}
                    </h3>
                    <p className="text-gray-500 mt-1">
                        {departments.length === 0
                            ? 'Create your first department to organize your teams'
                            : 'Try adjusting or clearing the current filters'}
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Sections
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Teams
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Member
                                    </th>
                                    {isAdmin && (
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredDepartments.map((department) => {
                                    const departmentSections = getDepartmentSections(department._id);
                                    const departmentTeams = getDepartmentTeams(department._id);

                                    return (
                                    <tr key={department._id} className="align-top hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-cyan-100 rounded-lg">
                                                    <BuildingOfficeIcon className="h-6 w-6 text-cyan-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{department.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {department.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {departmentSections.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {departmentSections.map((section) => (
                                                        <span
                                                            key={section._id}
                                                            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                                        >
                                                            <RectangleStackIcon className="h-3.5 w-3.5" />
                                                            {section.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No sections</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {departmentTeams.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {departmentTeams.map((team) => (
                                                        <span
                                                            key={team._id}
                                                            className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                                                        >
                                                            <UserGroupIcon className="h-3.5 w-3.5" />
                                                            {team.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No teams</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 font-medium ${getCountBadgeClass(department.memberCount || 0)}`}>
                                                {department.memberCount || 0}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openModal(department)}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDepartmentToDelete(department)}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDepartment ? 'Edit Department' : 'Create Department'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingDepartment ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!departmentToDelete}
                onClose={() => setDepartmentToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Department"
                message={deleteBlocked
                    ? deleteBlockMessage
                    : 'Are you sure you want to delete this department?'}
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

export default Departments;
