import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, CheckIcon, XMarkIcon, CalendarDaysIcon, NoSymbolIcon, ArrowPathIcon, BriefcaseIcon, BuildingOfficeIcon, RectangleStackIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { userService, departmentService, teamService, roleService, sectionService, projectPositionService, assessmentService } from '../services';
import { User, UserSkill, SkillCategory, ROLE_LABELS, ROLE_LEVELS, UserRole, Department, Team, Section, ProficiencyLevel, formatProficiencyLevel, ProjectPosition } from '../types';
import { Role } from '../services/roleService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import CategoryColorDot from '../components/CategoryColorDot';
import Modal from '../components/Modal';
import AssessmentMatrixSnapshot from '../components/AssessmentMatrixSnapshot';

// Proficiency level colors for matrix boxes
const proficiencyColors: Record<ProficiencyLevel, string> = {
    1: 'bg-gray-200 text-gray-700',
    2: 'bg-gray-300 text-gray-800',
    3: 'bg-green-200 text-green-800',
    4: 'bg-blue-200 text-blue-800',
    5: 'bg-indigo-300 text-indigo-900',
    6: 'bg-purple-300 text-purple-900',
    7: 'bg-orange-300 text-orange-900',
    8: 'bg-red-300 text-red-900',
    9: 'bg-rose-300 text-rose-900',
};

// Helper function to calculate employment duration
const calculateEmploymentDuration = (hireDate: string): string => {
    const start = new Date(hireDate);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (years === 0 && months === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

    return parts.join(', ');
};

const formatMonthPeriod = (value: string) => {
    if (!value) {
        return '';
    }

    const [year, month] = value.split('-');
    const monthIndex = Number(month) - 1;

    if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return value;
    }

    return new Date(Number(year), monthIndex, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });
};

const UserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [skills, setSkills] = useState<UserSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [projectPositions, setProjectPositions] = useState<ProjectPosition[]>([]);
    const [editForm, setEditForm] = useState({
        role: '' as UserRole,
        projectPosition: '',
        department: '',
        section: '',
        team: '',
        hireDate: '',
    });
    const [deactivating, setDeactivating] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [resetPasswordData, setResetPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [resetPasswordError, setResetPasswordError] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [submittingAssessment, setSubmittingAssessment] = useState(false);
    const [assessmentError, setAssessmentError] = useState('');
    const [assessmentNotice, setAssessmentNotice] = useState('');
    const [assessmentForm, setAssessmentForm] = useState({
        period: '',
        type: 'quarterly' as const,
        skillRatings: [] as Array<{ skill: string; memberRating?: number; rating: number; comments?: string }>,
        overallComments: '',
    });

    const isAdmin = currentUser?.role === 'admin';
    const canCreateAssessmentForUser = Boolean(
        currentUser &&
        user &&
        currentUser.role !== 'admin' &&
        (currentUser._id || currentUser.id) !== (user._id || user.id) &&
        ((currentUser.roleLevel || ROLE_LEVELS[currentUser.role] || 1) > (user.roleLevel || ROLE_LEVELS[user.role] || 1))
    );
    const showPrefilledSkillRatings = false;

    const fetchData = async () => {
        if (!id) return;
        try {
            const response = await userService.getUser(id);
            if (response.success && response.data) {
                setUser(response.data.user);
                setSkills(response.data.skills);
                // Initialize edit form with current values
                const u = response.data.user;
                setEditForm({
                    role: u.role,
                    projectPosition: typeof u.projectPosition === 'object' ? u.projectPosition?._id || '' : u.projectPosition || '',
                    department: typeof u.department === 'object' ? u.department?._id || '' : u.department || '',
                    section: typeof u.team === 'object'
                        ? (typeof u.team?.section === 'string' ? u.team.section : u.team?.section?._id) || ''
                        : '',
                    team: typeof u.team === 'object' ? u.team?._id || '' : u.team || '',
                    hireDate: u.hireDate ? u.hireDate.split('T')[0] : '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminData = async () => {
        if (!isAdmin) return;
        try {
            const [deptRes, sectionRes, teamRes, rolesRes, projectPositionRes] = await Promise.all([
                departmentService.getDepartments(),
                sectionService.getSections(),
                teamService.getTeams(),
                roleService.getRoles(),
                projectPositionService.getProjectPositions(),
            ]);
            if (deptRes.success) setDepartments(deptRes.data || []);
            if (sectionRes.success) setSections(sectionRes.data || []);
            if (teamRes.success) setTeams(teamRes.data || []);
            if (projectPositionRes.success) setProjectPositions(projectPositionRes.data || []);
            if (rolesRes.success) {
                // Filter out admin role - admins can't be assigned through this UI
                const assignableRoles = (rolesRes.data || []).filter(r => r.key !== 'admin');
                setRoles(assignableRoles);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchAdminData();
    }, [id, isAdmin]);

    const resetAssessmentForm = () => {
        setAssessmentForm({
            period: '',
            type: 'quarterly',
            skillRatings: skills.map((userSkill) => ({
                skill: userSkill.skill._id,
                memberRating: userSkill.proficiencyLevel,
                rating: userSkill.proficiencyLevel,
                comments: '',
            })),
            overallComments: '',
        });
        setAssessmentError('');
    };

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const response = await userService.updateUser(id, {
                role: editForm.role,
                projectPosition: editForm.projectPosition || undefined,
                department: editForm.department || undefined,
                team: editForm.team || undefined,
                hireDate: editForm.hireDate || undefined,
            });
            if (response.success) {
                await fetchData();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to update user:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setEditForm({
                role: user.role,
                projectPosition: typeof user.projectPosition === 'object' ? user.projectPosition?._id || '' : user.projectPosition || '',
                department: typeof user.department === 'object' ? user.department?._id || '' : user.department || '',
                section: typeof user.team === 'object'
                    ? (typeof user.team?.section === 'string' ? user.team.section : user.team?.section?._id) || ''
                    : '',
                team: typeof user.team === 'object' ? user.team?._id || '' : user.team || '',
                hireDate: user.hireDate ? user.hireDate.split('T')[0] : '',
            });
        }
        setIsEditing(false);
    };

    const handleDeactivateUser = async () => {
        if (!id || !confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) return;
        setDeactivating(true);
        try {
            await userService.deactivateUser(id);
            await fetchData();
        } catch (error) {
            console.error('Failed to deactivate user:', error);
        } finally {
            setDeactivating(false);
        }
    };

    const handleReactivateUser = async () => {
        if (!id) return;
        setDeactivating(true);
        try {
            await userService.reactivateUser(id);
            await fetchData();
        } catch (error) {
            console.error('Failed to reactivate user:', error);
        } finally {
            setDeactivating(false);
        }
    };

    const openResetPasswordModal = () => {
        setResetPasswordData({ newPassword: '', confirmPassword: '' });
        setResetPasswordError('');
        setIsResetPasswordOpen(true);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        if (resetPasswordData.newPassword.length < 6) {
            setResetPasswordError('Password must be at least 6 characters long.');
            return;
        }

        if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
            setResetPasswordError('Passwords do not match.');
            return;
        }

        setResetPasswordError('');
        setResettingPassword(true);

        try {
            const response = await userService.resetUserPassword(id, resetPasswordData.newPassword);
            if (response.success) {
                setIsResetPasswordOpen(false);
                setResetPasswordData({ newPassword: '', confirmPassword: '' });
            } else {
                setResetPasswordError(response.message || 'Failed to reset password.');
            }
        } catch (error: any) {
            setResetPasswordError(error.response?.data?.message || 'Failed to reset password.');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleOpenAssessmentModal = () => {
        resetAssessmentForm();
        setAssessmentNotice('');
        setIsAssessmentModalOpen(true);
    };

    const updateAssessmentSkillRating = (index: number, updates: Partial<{ rating: number; comments?: string }>) => {
        const nextSkillRatings = [...assessmentForm.skillRatings];
        nextSkillRatings[index] = {
            ...nextSkillRatings[index],
            ...updates,
        };
        setAssessmentForm({ ...assessmentForm, skillRatings: nextSkillRatings });
    };

    const updateAssessmentSkillRatingBySkill = (skillId: string, updates: Partial<{ rating: number; comments?: string }>) => {
        const skillRatingIndex = assessmentForm.skillRatings.findIndex((skillRating) => skillRating.skill === skillId);

        if (skillRatingIndex === -1) {
            return;
        }

        updateAssessmentSkillRating(skillRatingIndex, updates);
    };

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id && !user?.id) return;

        try {
            setSubmittingAssessment(true);
            setAssessmentError('');
            const response = await assessmentService.createAssessment({
                assessee: user._id || user.id,
                period: formatMonthPeriod(assessmentForm.period),
                type: assessmentForm.type,
                skillRatings: assessmentForm.skillRatings,
                overallComments: assessmentForm.overallComments,
            });

            if (response.success) {
                setIsAssessmentModalOpen(false);
                setAssessmentNotice(`Assessment created for ${user.firstName} ${user.lastName}.`);
            } else {
                setAssessmentError(response.message || 'Failed to create assessment.');
            }
        } catch (error: any) {
            setAssessmentError(error.response?.data?.message || 'Failed to create assessment.');
        } finally {
            setSubmittingAssessment(false);
        }
    };

    // Filter teams by selected department
    const filteredTeams = editForm.department
        ? teams.filter(t => {
            const deptId = typeof t.department === 'object' ? (t.department as Department)?._id : t.department;
            const sectionId = typeof t.section === 'string' ? t.section : t.section?._id;
            if (deptId !== editForm.department) {
                return false;
            }
            if (editForm.section && sectionId !== editForm.section) {
                return false;
            }
            return true;
        })
        : teams;

    const filteredSections = editForm.department
        ? sections.filter(section => {
            const deptId = typeof section.department === 'object' ? section.department?._id : section.department;
            return deptId === editForm.department;
        })
        : sections;

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">User not found</p>
                <Link to="/users" className="text-primary-600 hover:underline mt-2 inline-block">
                    Back to Users
                </Link>
            </div>
        );
    }

    // Group skills by category
    const skillsByCategory = skills.reduce((acc, skill) => {
        const cat = skill.skill.category as SkillCategory;
        const catId = cat?._id || 'uncategorized';
        if (!acc[catId]) {
            acc[catId] = { category: cat, skills: [] };
        }
        acc[catId].skills.push(skill);
        return acc;
    }, {} as Record<string, { category: SkillCategory; skills: UserSkill[] }>);

    return (
        <>
            <div className="space-y-6">
            <Link to="/users" className="flex items-center text-gray-500 hover:text-gray-700 text-sm">
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Users
            </Link>

            {/* User Profile Card */}
            <div className="card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        {user.avatar ? (
                            <img src={user.avatar} alt="" className="h-24 w-24 rounded-full" />
                        ) : (
                            <span className="text-primary-600 font-bold text-3xl">
                                {user.firstName[0]}{user.lastName[0]}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {user.firstName} {user.lastName}
                            </h1>
                            {isAdmin && user.role !== 'admin' && !isEditing && (
                                <div className="flex items-center gap-2">
                                    {canCreateAssessmentForUser && (
                                        <button onClick={handleOpenAssessmentModal} className="btn btn-primary">
                                            Create Assessment
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn btn-secondary flex items-center gap-2"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                        Edit User
                                    </button>
                                </div>
                            )}
                            {!isAdmin && !isEditing && canCreateAssessmentForUser && (
                                <button onClick={handleOpenAssessmentModal} className="btn btn-primary">
                                    Create Assessment
                                </button>
                            )}
                            {isEditing && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={saving}
                                        className="btn btn-secondary flex items-center gap-2"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                        {assessmentNotice && (
                            <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                                {assessmentNotice}
                            </div>
                        )}
                        {user.bio && <p className="text-gray-600 mt-3">{user.bio}</p>}

                        {/* Display mode */}
                        {!isEditing && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {user.department && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                                        <BuildingOfficeIcon className="h-4 w-4" />
                                        {typeof user.department === 'string' ? user.department : user.department.name}
                                    </span>
                                )}
                                {typeof user.team === 'object' && user.team?.section && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                                        <RectangleStackIcon className="h-4 w-4" />
                                        {typeof user.team.section === 'string' ? user.team.section : user.team.section.name}
                                    </span>
                                )}
                                {user.team && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                                        <UserGroupIcon className="h-4 w-4" />
                                        {typeof user.team === 'string' ? user.team : user.team.name}
                                    </span>
                                )}
                                {user.projectPosition && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900">
                                        <BriefcaseIcon className="h-4 w-4" />
                                        {typeof user.projectPosition === 'string' ? user.projectPosition : user.projectPosition.name}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                                    <ShieldCheckIcon className="h-4 w-4" />
                                    {ROLE_LABELS[user.role as UserRole] || user.role}
                                </span>
                            </div>
                        )}

                        {/* Hire Date Display */}
                        {!isEditing && user.hireDate && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                                <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                                <span>
                                    Hired on {new Date(user.hireDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-primary-600 font-medium">
                                    {calculateEmploymentDuration(user.hireDate)} employed
                                </span>
                            </div>
                        )}

                        {/* Inactive Status Banner */}
                        {!isEditing && user.isActive === false && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                <NoSymbolIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">This user is inactive</p>
                                    {user.deactivatedAt && (
                                        <p className="text-xs text-red-600">
                                            Deactivated on {new Date(user.deactivatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={handleReactivateUser}
                                        disabled={deactivating}
                                        className="btn btn-primary text-sm flex items-center gap-2"
                                    >
                                        <ArrowPathIcon className="h-4 w-4" />
                                        {deactivating ? 'Processing...' : 'Reactivate'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Deactivate Button for Active Users */}
                        {!isEditing && isAdmin && (
                            <div className="mt-4">
                                <button
                                    onClick={openResetPasswordModal}
                                    className="text-sm text-primary-600 hover:text-primary-800"
                                >
                                    Reset Password
                                </button>
                            </div>
                        )}

                        {!isEditing && isAdmin && user.role !== 'admin' && user.isActive !== false && (
                            <div className="mt-4">
                                <button
                                    onClick={handleDeactivateUser}
                                    disabled={deactivating}
                                    className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                                >
                                    <NoSymbolIcon className="h-4 w-4" />
                                    {deactivating ? 'Processing...' : 'Deactivate User'}
                                </button>
                            </div>
                        )}

                        {/* Edit mode for admins */}
                        {isEditing && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                                <h3 className="font-medium text-gray-900">Edit User Assignment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role
                                        </label>
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                            className="input w-full"
                                        >
                                            {roles.map((role) => (
                                                <option key={role.key} value={role.key}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Company Positions
                                        </label>
                                        <select
                                            value={editForm.projectPosition}
                                            onChange={(e) => setEditForm({ ...editForm, projectPosition: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="">No Company Position</option>
                                            {projectPositions.map((projectPosition) => (
                                                <option key={projectPosition._id} value={projectPosition._id}>
                                                    {projectPosition.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department
                                        </label>
                                        <select
                                            value={editForm.department}
                                            onChange={(e) => setEditForm({ ...editForm, department: e.target.value, section: '', team: '' })}
                                            className="input w-full"
                                        >
                                            <option value="">No Department</option>
                                            {departments.map((dept) => (
                                                <option key={dept._id} value={dept._id}>
                                                    {dept.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Section
                                        </label>
                                        <select
                                            value={editForm.section}
                                            onChange={(e) => setEditForm({ ...editForm, section: e.target.value, team: '' })}
                                            className="input w-full"
                                            disabled={!editForm.department}
                                        >
                                            <option value="">No Section</option>
                                            {filteredSections.map((section) => (
                                                <option key={section._id} value={section._id}>
                                                    {section.name}
                                                </option>
                                            ))}
                                        </select>
                                        {!editForm.department && (
                                            <p className="text-xs text-gray-500 mt-1">Select a department first</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Team
                                        </label>
                                        <select
                                            value={editForm.team}
                                            onChange={(e) => {
                                                const selectedTeam = teams.find((team) => team._id === e.target.value);
                                                const selectedSectionId = typeof selectedTeam?.section === 'string'
                                                    ? selectedTeam.section
                                                    : selectedTeam?.section?._id || '';
                                                setEditForm({ ...editForm, team: e.target.value, section: selectedSectionId || editForm.section });
                                            }}
                                            className="input w-full"
                                            disabled={!editForm.department}
                                        >
                                            <option value="">No Team</option>
                                            {filteredTeams.map((team) => (
                                                <option key={team._id} value={team._id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                        {!editForm.department ? (
                                            <p className="text-xs text-gray-500 mt-1">Select a department first</p>
                                        ) : editForm.section && filteredTeams.length === 0 ? (
                                            <p className="text-xs text-gray-500 mt-1">No teams are available in this section</p>
                                        ) : null}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hire Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.hireDate}
                                            onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Skills Matrix Section */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Skills Matrix ({skills.length})
                </h2>
                {skills.length === 0 ? (
                    <div className="card text-center py-8">
                        <p className="text-gray-500">No public skills to display</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-100 sticky left-0 z-10 min-w-[150px]">
                                            Category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 min-w-[120px]">
                                            Skill
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 min-w-[100px]">
                                            Proficiency
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 min-w-[80px]">
                                            Years
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {Object.values(skillsByCategory).map((group) => (
                                        group.skills.map((userSkill, skillIndex) => (
                                            <tr key={userSkill._id} className="hover:bg-gray-50">
                                                {skillIndex === 0 && (
                                                    <td
                                                        rowSpan={group.skills.length}
                                                        className="px-4 py-3 align-top bg-gray-50 sticky left-0 z-10 border-r border-gray-200"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <CategoryColorDot color={group.category?.color || '#6B7280'} />
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {group.category?.name || 'Uncategorized'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-900">{userSkill.skill.name}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div
                                                        className={`inline-flex items-center justify-center min-w-[80px] px-2 py-1 rounded text-xs font-semibold ${proficiencyColors[userSkill.proficiencyLevel]}`}
                                                        title={formatProficiencyLevel(userSkill.proficiencyLevel)}
                                                    >
                                                        <span>{formatProficiencyLevel(userSkill.proficiencyLevel)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-sm text-gray-600">
                                                        {userSkill.yearsOfExperience ? `${userSkill.yearsOfExperience}y` : '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            </div>

            <Modal
                isOpen={isAssessmentModalOpen}
                onClose={() => setIsAssessmentModalOpen(false)}
                title={`Create Assessment${user ? `: ${user.firstName} ${user.lastName}` : ''}`}
                size="2xl"
            >
                <form onSubmit={handleCreateAssessment} className="space-y-4">
                    {assessmentError && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {assessmentError}
                        </div>
                    )}

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900">Matrix-Based Assessment</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Use the current skill matrix on this page as your reference when submitting the assessment.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="label">Period</label>
                            <input
                                type="month"
                                value={assessmentForm.period}
                                onChange={(e) => setAssessmentForm({ ...assessmentForm, period: e.target.value })}
                                className="input calendar-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Type</label>
                            <select
                                value={assessmentForm.type}
                                onChange={(e) => setAssessmentForm({ ...assessmentForm, type: e.target.value as typeof assessmentForm.type })}
                                className="input"
                            >
                                <option value="quarterly">Quarterly</option>
                                <option value="semi_annual">Semi-Annual</option>
                                <option value="annual">Annual</option>
                                <option value="probation">Probation</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                    </div>

                    {assessmentForm.skillRatings.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Assessment by Matrix Skill</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Use the current skill matrix on this page as your reference and add your rating and comments per skill.
                            </p>
                            <AssessmentMatrixSnapshot
                                skills={skills}
                                skillRatings={assessmentForm.skillRatings}
                                onSkillRatingChange={updateAssessmentSkillRatingBySkill}
                            />
                        </div>
                    )}

                    {showPrefilledSkillRatings && assessmentForm.skillRatings.length > 0 && (
                        <div>
                            <div className="mb-2">
                                <label className="label">Assessment by Matrix Skill</label>
                                <p className="text-xs text-gray-500">
                                    These skill ratings are prefilled from the member’s current matrix and can be adjusted with your comments.
                                </p>
                            </div>
                            <div className="space-y-3">
                                {assessmentForm.skillRatings.map((skillRating, index) => {
                                    const matrixSkill = skills.find((userSkill) => userSkill.skill._id === skillRating.skill);
                                    return (
                                        <div key={`${skillRating.skill}-${index}`} className="rounded-lg border border-gray-200 p-4">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{matrixSkill?.skill.name || 'Skill'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Current matrix level: {matrixSkill ? formatProficiencyLevel(matrixSkill.proficiencyLevel) : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="w-full md:max-w-xs">
                                                    <label className="mb-1 block text-xs font-medium text-gray-600">Assessor Rating</label>
                                                    <select
                                                        value={skillRating.rating}
                                                        onChange={(e) => updateAssessmentSkillRating(index, { rating: Number(e.target.value) })}
                                                        className="input"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((rating) => (
                                                            <option key={rating} value={rating}>
                                                                {formatProficiencyLevel(rating as ProficiencyLevel)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <textarea
                                                value={skillRating.comments || ''}
                                                onChange={(e) => updateAssessmentSkillRating(index, { comments: e.target.value })}
                                                placeholder="Optional comments for this skill..."
                                                className="input mt-3"
                                                rows={3}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="label">Overall Comments</label>
                        <textarea
                            value={assessmentForm.overallComments}
                            onChange={(e) => setAssessmentForm({ ...assessmentForm, overallComments: e.target.value })}
                            rows={4}
                            className="input"
                            placeholder="Overall performance comments..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsAssessmentModalOpen(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submittingAssessment}>
                            {submittingAssessment ? 'Creating...' : 'Create Assessment'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isResetPasswordOpen}
                onClose={() => setIsResetPasswordOpen(false)}
                title={`Reset Password${user ? `: ${user.firstName} ${user.lastName}` : ''}`}
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    {resetPasswordError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {resetPasswordError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={resetPasswordData.newPassword}
                            onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                            className="input w-full"
                            minLength={6}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={resetPasswordData.confirmPassword}
                            onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                            className="input w-full"
                            minLength={6}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsResetPasswordOpen(false)}
                            className="btn btn-secondary"
                            disabled={resettingPassword}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={resettingPassword}
                        >
                            {resettingPassword ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default UserDetail;
