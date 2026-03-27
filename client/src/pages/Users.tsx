import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, BuildingOfficeIcon, RectangleStackIcon, UserGroupIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { userService, departmentService, teamService, roleService, sectionService } from '../services';
import { User, Department, Team, Section } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Role } from '../services/roleService';

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        department: '',
        section: '',
        team: '',
        role: '',
        status: 'all',
    });

    useEffect(() => {
        const fetchFilters = async () => {
            const [deptRes, sectionRes, teamRes, rolesRes] = await Promise.all([
                departmentService.getDepartments(),
                sectionService.getSections(),
                teamService.getTeams(),
                roleService.getRoles(),
            ]);

            if (deptRes.success) setDepartments(deptRes.data || []);
            if (sectionRes.success) setSections(sectionRes.data || []);
            if (teamRes.success) setTeams(teamRes.data || []);
            if (rolesRes.success) setRoles(rolesRes.data || []);
        };

        fetchFilters();
    }, []);

    const roleNameMap = new Map(roles.map((role) => [role.key, role.name]));
    const getRoleLabel = (roleKey: string) => roleNameMap.get(roleKey) || roleKey.replace(/_/g, ' ');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const params: Record<string, string> = {};
                if (search) params.search = search;
                if (filters.department) params.department = filters.department;
                if (filters.section) params.section = filters.section;
                if (filters.team) params.team = filters.team;
                if (filters.role) params.role = filters.role;
                if (filters.status) params.status = filters.status;

                const response = await userService.getUsers(params);
                if (response.success) {
                    setUsers(response.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [search, filters]);

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

    const clearFilters = () => {
        setSearch('');
        setFilters({ department: '', section: '', team: '', role: '', status: 'all' });
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 -mt-4 sm:-mt-6 lg:-mt-8 space-y-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 mt-1">Browse and find team members</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[16rem]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value, section: '', team: '' })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                                {dept.name}
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
                    <select
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                        className="input w-full sm:w-48"
                    >
                        <option value="">All Roles</option>
                        {roles.map((role) => (
                            <option key={role.key} value={role.key}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="input w-full sm:w-40"
                    >
                        <option value="all">All Users</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    {(search || filters.department || filters.section || filters.team || filters.role || filters.status !== 'all') && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : users.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-gray-500">No users found</p>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-auto max-h-[calc(100vh-280px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Company Positions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Section
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr
                                        key={user._id || user.id}
                                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${user.isActive === false ? 'opacity-60' : ''}`}
                                        onClick={() => window.location.href = `/users/${user._id || user.id}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/users/${user._id || user.id}`} className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" />
                                                    ) : (
                                                        <span className="text-primary-600 font-semibold">
                                                            {user.firstName[0]}{user.lastName[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {user.firstName} {user.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{user.title || ''}</p>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{user.email}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.projectPosition ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-900">
                                                    <BriefcaseIcon className="h-3.5 w-3.5" />
                                                    {typeof user.projectPosition === 'string' ? user.projectPosition : user.projectPosition.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium">
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.department ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                    {typeof user.department === 'string' ? user.department : user.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {typeof user.team === 'object' && user.team?.section ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                    <RectangleStackIcon className="h-3.5 w-3.5" />
                                                    {typeof user.team.section === 'string' ? user.team.section : user.team.section.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.team ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                                    <UserGroupIcon className="h-3.5 w-3.5" />
                                                    {typeof user.team === 'string' ? user.team : user.team.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isActive === false ? (
                                                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded font-medium">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
