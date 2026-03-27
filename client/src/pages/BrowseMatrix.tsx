import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    UserGroupIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    BuildingOfficeIcon,
    RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { departmentService, sectionService, teamService, userService } from '../services';
import { Department, ROLE_LABELS, Section, Team, User } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const getUserId = (user: User) => user._id || user.id;

const getEntityName = (entity?: { name?: string } | string) => {
    if (!entity || typeof entity === 'string') {
        return '';
    }

    return entity.name || '';
};

const getSectionName = (team?: Team | string) => {
    if (!team || typeof team === 'string' || !team.section || typeof team.section === 'string') {
        return '';
    }

    return team.section.name || '';
};

const getInitials = (user: User) => `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

const BrowseMatrix: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedUser, setSelectedUser] = useState('');

    useEffect(() => {
        const fetchBrowseData = async () => {
            try {
                setLoading(true);
                setError('');
                const [usersResponse, departmentsResponse, sectionsResponse, teamsResponse] = await Promise.all([
                    userService.getUsers({
                        context: 'browse_matrix',
                        status: 'active',
                        approval: 'approved',
                        limit: '200',
                    }),
                    departmentService.getDepartments(),
                    sectionService.getSections(),
                    teamService.getTeams(),
                ]);

                if (usersResponse.success) {
                    setUsers(usersResponse.data || []);
                } else {
                    setError(usersResponse.message || 'Failed to load members.');
                }

                if (departmentsResponse.success) {
                    setDepartments(departmentsResponse.data || []);
                }

                if (sectionsResponse.success) {
                    setSections(sectionsResponse.data || []);
                }

                if (teamsResponse.success) {
                    setTeams(teamsResponse.data || []);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load members.');
            } finally {
                setLoading(false);
            }
        };

        fetchBrowseData();
    }, []);

    const filteredSections = useMemo(() => {
        if (!selectedDepartment) {
            return sections;
        }

        return sections.filter((section) => {
            const departmentId =
                typeof section.department === 'string' ? section.department : section.department?._id;
            return departmentId === selectedDepartment;
        });
    }, [sections, selectedDepartment]);

    const filteredTeams = useMemo(() => {
        return teams.filter((team) => {
            const departmentId =
                typeof team.department === 'string' ? team.department : team.department?._id;
            const sectionId = typeof team.section === 'string' ? team.section : team.section?._id;

            if (selectedDepartment && departmentId !== selectedDepartment) {
                return false;
            }

            if (selectedSection && sectionId !== selectedSection) {
                return false;
            }

            return true;
        });
    }, [selectedDepartment, selectedSection, teams]);

    const organizationFilteredUsers = useMemo(() => {
        const currentUserId = currentUser ? getUserId(currentUser) : '';

        return users
            .filter((candidate) => getUserId(candidate) !== currentUserId)
            .filter((candidate) => candidate.role !== 'admin')
            .filter((candidate) => {
                const departmentId =
                    typeof candidate.department === 'string' ? candidate.department : candidate.department?._id;
                const teamId = typeof candidate.team === 'string' ? candidate.team : candidate.team?._id;
                const sectionId =
                    typeof candidate.team === 'object' && candidate.team
                        ? typeof candidate.team.section === 'string'
                            ? candidate.team.section
                            : candidate.team.section?._id
                        : '';

                if (selectedDepartment && departmentId !== selectedDepartment) {
                    return false;
                }

                if (selectedSection && sectionId !== selectedSection) {
                    return false;
                }

                if (selectedTeam && teamId !== selectedTeam) {
                    return false;
                }

                return true;
            });
    }, [currentUser, selectedDepartment, selectedSection, selectedTeam, users]);

    const filteredUsers = useMemo(() => {
        if (!selectedUser) {
            return organizationFilteredUsers;
        }

        return organizationFilteredUsers.filter((candidate) => getUserId(candidate) === selectedUser);
    }, [organizationFilteredUsers, selectedUser]);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Browse Matrix</h1>
                    <p className="mt-1 text-gray-500">
                        Explore other members&apos; public skill matrices and endorse skills in context.
                    </p>
                </div>
                <div className="text-sm text-gray-500">
                    {filteredUsers.length} member{filteredUsers.length === 1 ? '' : 's'} available
                </div>
            </div>

            <div className="card">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <div>
                        <label className="label">Department</label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                setSelectedSection('');
                                setSelectedTeam('');
                                setSelectedUser('');
                            }}
                            className="input"
                        >
                            <option value="">All departments</option>
                            {departments.map((department) => (
                                <option key={department._id} value={department._id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Section</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => {
                                setSelectedSection(e.target.value);
                                setSelectedTeam('');
                                setSelectedUser('');
                            }}
                            className="input"
                            disabled={!selectedDepartment}
                        >
                            <option value="">{selectedDepartment ? 'All sections' : 'Select department first'}</option>
                            {filteredSections.map((section) => (
                                <option key={section._id} value={section._id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Team</label>
                        <select
                            value={selectedTeam}
                            onChange={(e) => {
                                setSelectedTeam(e.target.value);
                                setSelectedUser('');
                            }}
                            className="input"
                            disabled={!selectedDepartment}
                        >
                            <option value="">{selectedDepartment ? 'All teams' : 'Select department first'}</option>
                            {filteredTeams.map((team) => (
                                <option key={team._id} value={team._id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">User</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="input"
                        >
                            <option value="">All users</option>
                            {organizationFilteredUsers.map((member) => (
                                <option key={getUserId(member)} value={getUserId(member)}>
                                    {member.firstName} {member.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {filteredUsers.length === 0 ? (
                <div className="card py-12 text-center">
                    <UserGroupIcon className="mx-auto h-10 w-10 text-gray-300" />
                    <h2 className="mt-4 text-lg font-semibold text-gray-900">No members found</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your filters to find another member&apos;s matrix.
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Role
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Department
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Section
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Team
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredUsers.map((member) => {
                                    const memberId = getUserId(member);
                                    const departmentName = getEntityName(member.department);
                                    const sectionName = getSectionName(member.team);
                                    const teamName = getEntityName(member.team);

                                    return (
                                        <tr key={memberId} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                                                        {getInitials(member)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-gray-900">
                                                            {member.firstName} {member.lastName}
                                                        </div>
                                                        <div className="truncate text-sm text-gray-500">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                                                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                                                    {ROLE_LABELS[member.role] || member.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {departmentName ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                                        <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                        {departmentName}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {sectionName ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                                        <RectangleStackIcon className="h-3.5 w-3.5" />
                                                        {sectionName}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {teamName ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                                        <UserGroupIcon className="h-3.5 w-3.5" />
                                                        {teamName}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Link
                                                    to={`/browse-matrix/${memberId}`}
                                                    aria-label={`View ${member.firstName} ${member.lastName}'s matrix`}
                                                    title={`View ${member.firstName} ${member.lastName}'s matrix`}
                                                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 p-2.5 text-white shadow-sm transition-colors duration-200 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                                >
                                                    <ArrowRightIcon className="h-4 w-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrowseMatrix;
