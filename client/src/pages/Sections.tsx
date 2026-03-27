import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, RectangleStackIcon, UserGroupIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { departmentService, sectionService, teamService } from '../services';
import { Department, Section, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';

const Sections: React.FC = () => {
    const { user } = useAuth();
    const [sections, setSections] = useState<Section[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [filters, setFilters] = useState({
        section: '',
        department: '',
        team: '',
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        department: '',
    });

    const isAdmin = user?.role === 'admin';

    const fetchData = async () => {
        try {
            const [sectionsRes, departmentsRes, teamsRes] = await Promise.all([
                sectionService.getSections(),
                departmentService.getDepartments(),
                teamService.getTeams(),
            ]);

            if (sectionsRes.success) {
                setSections(sectionsRes.data || []);
            }

            if (departmentsRes.success) {
                setDepartments(departmentsRes.data || []);
            }

            if (teamsRes.success) {
                setTeams(teamsRes.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch sections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (section?: Section) => {
        setEditingSection(section || null);
        setFormData({
            name: section?.name || '',
            description: section?.description || '',
            department:
                typeof section?.department === 'string'
                    ? section.department
                    : section?.department?._id || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setErrorMessage('');
            if (editingSection) {
                await sectionService.updateSection(editingSection._id, formData);
                setSuccessMessage(`${formData.name} was updated successfully.`);
            } else {
                await sectionService.createSection(formData);
                setSuccessMessage(`${formData.name} was created successfully.`);
            }
            setIsModalOpen(false);
            setFormData({ name: '', description: '', department: '' });
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to save section.');
            console.error('Failed to save section:', error);
        }
    };

    const handleDelete = async () => {
        if (!sectionToDelete) return;
        try {
            setErrorMessage('');
            const deletedName = sectionToDelete.name;
            await sectionService.deleteSection(sectionToDelete._id);
            setSectionToDelete(null);
            setSuccessMessage(`${deletedName} was deleted successfully.`);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to delete section.');
            console.error('Failed to delete section:', error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const getCountBadgeClass = (count: number) =>
        count === 0
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700';

    const getSectionTeams = (sectionId: string) =>
        teams.filter((team) => {
            if (team.deletedAt) return false;
            const teamSectionId =
                typeof team.section === 'string'
                    ? team.section
                    : team.section?._id;
            return teamSectionId === sectionId;
        });

    const filteredSectionsForOptions = sections.filter((section) => {
        const departmentId =
            typeof section.department === 'string' ? section.department : section.department?._id;

        if (filters.department && departmentId !== filters.department) {
            return false;
        }

        if (filters.team) {
            const sectionTeams = getSectionTeams(section._id);
            if (!sectionTeams.some((team) => team._id === filters.team)) {
                return false;
            }
        }

        return true;
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

    const filteredSections = sections.filter((section) => {
        const departmentId =
            typeof section.department === 'string' ? section.department : section.department?._id;
        const sectionTeams = getSectionTeams(section._id);

        if (filters.section && section._id !== filters.section) {
            return false;
        }

        if (filters.department && departmentId !== filters.department) {
            return false;
        }

        if (filters.team && !sectionTeams.some((team) => team._id === filters.team)) {
            return false;
        }

        return true;
    });

    const clearFilters = () => {
        setFilters({
            section: '',
            department: '',
            team: '',
        });
    };

    const deleteBlocked = !!sectionToDelete && (
        (sectionToDelete.teamCount || 0) > 0 ||
        (sectionToDelete.userCount || 0) > 0
    );

    const deleteBlockMessage = sectionToDelete
        ? `This section still has ${sectionToDelete.teamCount || 0} team(s) and ${sectionToDelete.userCount || 0} member(s) assigned. Remove or reassign them first.`
        : '';

    return (
        <div className="space-y-6">
            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            <div className="sticky top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 -mt-4 sm:-mt-6 lg:-mt-8 space-y-4 border-b border-gray-200">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
                        <p className="text-gray-500 mt-1">Manage sections and assign them to departments</p>
                        <p className="text-xs text-gray-500 mt-2">
                            A section can be deleted only when it has no assigned teams and no assigned members.
                        </p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => openModal()} className="btn-primary">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Section
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                    <select
                        value={filters.section}
                        onChange={(e) => setFilters({ ...filters, section: e.target.value, team: '' })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Sections</option>
                        {filteredSectionsForOptions.map((section) => (
                            <option key={section._id} value={section._id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
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
                    {(filters.section || filters.department || filters.team) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {filteredSections.length === 0 ? (
                <div className="card text-center py-12">
                    <RectangleStackIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">
                        {sections.length === 0 ? 'No sections yet' : 'No sections match these filters'}
                    </h3>
                    <p className="text-gray-500 mt-1">
                        {sections.length === 0
                            ? 'Create your first section and assign it to a department'
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
                                        Section
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Department
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
                                {filteredSections.map((section) => {
                                    const sectionTeams = getSectionTeams(section._id);
                                    const fallbackUserCount = sectionTeams.reduce(
                                        (total, team) => total + (team.memberCount || 0),
                                        0
                                    );
                                    const sectionUserCount = Math.max(section.userCount ?? 0, fallbackUserCount);

                                    return (
                                    <tr key={section._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-100 rounded-lg">
                                                    <RectangleStackIcon className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{section.name}</p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {section.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                {typeof section.department === 'string'
                                                    ? departments.find((department) => department._id === section.department)?.name || section.department
                                                    : section.department.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sectionTeams.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {sectionTeams.map((team) => (
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
                                            <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 font-medium ${getCountBadgeClass(sectionUserCount)}`}>
                                                {sectionUserCount}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openModal(section)}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setSectionToDelete(section)}
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSection ? 'Edit Section' : 'Add Section'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Section Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Department</label>
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="input"
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.filter((department) => !department.deletedAt).map((department) => (
                                <option key={department._id} value={department._id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
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
                            {editingSection ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!sectionToDelete}
                onClose={() => setSectionToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Section"
                message={deleteBlocked
                    ? deleteBlockMessage
                    : 'Are you sure you want to delete this section?'}
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

export default Sections;
