import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, UserGroupIcon, BuildingOfficeIcon, RectangleStackIcon, TrashIcon } from '@heroicons/react/24/outline';
import { teamService, departmentService, sectionService } from '../services';
import { Team, Department, Section } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';

const Teams: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [filters, setFilters] = useState({
        team: '',
        department: '',
        section: '',
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState({ name: '', description: '', department: '', section: '' });

    const isAdmin = user?.role === 'admin' || Boolean(user?.roleLevel && user.roleLevel >= 3);

    const fetchData = async () => {
        try {
            const [teamsRes, deptRes, sectionsRes] = await Promise.all([
                teamService.getTeams(),
                departmentService.getDepartments(),
                sectionService.getSections(),
            ]);
            if (teamsRes.success) setTeams(teamsRes.data || []);
            if (deptRes.success) setDepartments(deptRes.data || []);
            if (sectionsRes.success) setSections(sectionsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setErrorMessage('');
            await teamService.createTeam(formData);
            setIsModalOpen(false);
            setFormData({ name: '', description: '', department: '', section: '' });
            setSuccessMessage(`${formData.name} was created successfully.`);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to create team.');
            console.error('Failed to create team:', error);
        }
    };

    const handleDelete = async () => {
        if (!teamToDelete) return;
        try {
            setErrorMessage('');
            const deletedName = teamToDelete.name;
            await teamService.deleteTeam(teamToDelete._id);
            setTeamToDelete(null);
            setSuccessMessage(`${deletedName} was deleted successfully.`);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to delete team.');
            console.error('Failed to delete team:', error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const getCountBadgeClass = (count: number) =>
        count === 0
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700';

    const filteredSections = formData.department
        ? sections.filter((section) => {
            if (section.deletedAt) return false;
            const departmentId = typeof section.department === 'string' ? section.department : section.department?._id;
            return departmentId === formData.department;
        })
        : sections.filter((section) => !section.deletedAt);

    const getDepartmentName = (team: Team) =>
        typeof team.department === 'string'
            ? departments.find((department) => department._id === team.department)?.name || team.department
            : team.department.name;

    const getSectionName = (team: Team) =>
        typeof team.section === 'string'
            ? sections.find((section) => section._id === team.section)?.name || team.section
            : team.section?.name || '';

    const filteredSectionsForOptions = sections.filter((section) => {
        if (!filters.department) return true;
        const departmentId = typeof section.department === 'string' ? section.department : section.department?._id;
        return departmentId === filters.department;
    });

    const filteredTeams = teams.filter((team) => {
        const departmentId =
            typeof team.department === 'string' ? team.department : team.department?._id;
        const sectionId =
            typeof team.section === 'string' ? team.section : team.section?._id;

        if (filters.team && team._id !== filters.team) {
            return false;
        }

        if (filters.department && departmentId !== filters.department) {
            return false;
        }

        if (filters.section && sectionId !== filters.section) {
            return false;
        }

        return true;
    });

    const clearFilters = () => {
        setFilters({
            team: '',
            department: '',
            section: '',
        });
    };

    const deleteBlocked = !!teamToDelete && (teamToDelete.memberCount || 0) > 0;

    const deleteBlockMessage = teamToDelete
        ? `This team still has ${teamToDelete.memberCount || 0} member(s) assigned. Remove or reassign them first.`
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
                        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
                        <p className="text-gray-500 mt-1">View and manage teams</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Team
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                    <select
                        value={filters.team}
                        onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Teams</option>
                        {teams.map((team) => (
                            <option key={team._id} value={team._id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value, section: '' })}
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
                        onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Sections</option>
                        {filteredSectionsForOptions.map((section) => (
                            <option key={section._id} value={section._id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
                    {(filters.team || filters.department || filters.section) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <div className="card text-center py-12">
                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">
                        {teams.length === 0 ? 'No teams yet' : 'No teams match these filters'}
                    </h3>
                    <p className="text-gray-500 mt-1">
                        {teams.length === 0
                            ? 'Create your first team to get started'
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
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Section
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Members
                                    </th>
                                    {isAdmin && (
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredTeams.map((team) => (
                                    <tr
                                        key={team._id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => navigate(`/teams/${team._id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-violet-100 rounded-lg">
                                                    <UserGroupIcon className="h-6 w-6 text-violet-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900">{team.name}</p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {team.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                {getDepartmentName(team)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {team.section ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                    <RectangleStackIcon className="h-3.5 w-3.5" />
                                                    {getSectionName(team)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">No section</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 font-medium ${getCountBadgeClass(team.memberCount || 0)}`}>
                                                {team.memberCount || 0}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTeamToDelete(team);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Team Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Team">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Team Name</label>
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
                            onChange={(e) => setFormData({ ...formData, department: e.target.value, section: '' })}
                            className="input"
                            required
                        >
                            <option value="">Select a department</option>
                            {departments.filter((department) => !department.deletedAt).map((dept) => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Section</label>
                        <select
                            value={formData.section}
                            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                            className="input"
                            required
                            disabled={!formData.department}
                        >
                            <option value="">Select a section</option>
                            {filteredSections.map((section) => (
                                <option key={section._id} value={section._id}>
                                    {section.name}
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
                            Create Team
                        </button>
                    </div>
                </form>
            </Modal>

            <SuccessDialog
                isOpen={!!successMessage}
                onClose={() => setSuccessMessage('')}
                title="Action Completed"
                message={successMessage}
            />

            <ConfirmDialog
                isOpen={!!teamToDelete}
                onClose={() => setTeamToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Team"
                message={deleteBlocked
                    ? deleteBlockMessage
                    : 'Are you sure you want to delete this team?'}
                confirmLabel="Delete"
                confirmDisabled={deleteBlocked}
            />
        </div>
    );
};

export default Teams;
