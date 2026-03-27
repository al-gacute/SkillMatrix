import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AcademicCapIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    HandThumbUpIcon,
    ClipboardDocumentCheckIcon,
    ChartBarIcon,
    UsersIcon,
    BellAlertIcon,
    ExclamationTriangleIcon,
    RectangleStackIcon,
    ShieldCheckIcon,
    BriefcaseIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { userSkillService, assessmentService, feedbackService, userService, departmentService, teamService, skillService, analyticsService, sectionService, notificationService, projectPositionService, roleService } from '../services';
import { UserSkill, Assessment, Feedback, ROLE_LABELS, UserRole, User, Team, Section, Notification, Department, ProjectPosition, ASSESSMENT_TYPE_LABELS, FEEDBACK_TYPE_LABELS, PROFICIENCY_LABELS, PROFICIENCY_LEVELS } from '../types';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProficiencyBadge from '../components/ProficiencyBadge';
import SuccessDialog from '../components/SuccessDialog';
import { OrganizationScope } from '../services/roleService';
import { useGlobalModalPresence } from '../utils/globalModalState';

interface RoleOption {
    _id: string;
    name: string;
    key: string;
    level: number;
    organizationScopes?: OrganizationScope[];
}

interface DashboardData {
    skills: UserSkill[];
    assessments: Assessment[];
    feedback: Feedback[];
}

interface AdminDashboardData {
    totalUsers: number;
    totalDepartments: number;
    totalSections: number;
    totalTeams: number;
    totalSkills: number;
    departments: Department[];
    projectPositions: ProjectPosition[];
    sections: Section[];
    teams: Team[];
    recentUsers: User[];
    pendingApprovals: Notification[];
    pendingCatalogRequests: Notification[];
    pendingApprovalCount: number;
    pendingCatalogRequestCount: number;
    pendingAdminActionCount: number;
    rolesWithoutOrganizationAssignment: RoleOption[];
    organizationAlerts: {
        usersWithoutTeam: User[];
        usersWithoutProjectPosition: User[];
        teamsWithoutSection: Team[];
        sectionsWithoutDepartment: Section[];
        summary: {
            usersWithoutTeam: number;
            usersWithoutProjectPosition: number;
            teamsWithoutSection: number;
            sectionsWithoutDepartment: number;
        };
    };
}

const getAssessmentStatusPresentation = (assessment: Assessment, currentUserId?: string) => {
    const isAssessor = assessment.assessor._id === currentUserId;

    if (assessment.assesseeAcknowledged || assessment.status === 'completed') {
        return {
            label: 'Acknowledge',
            className: 'bg-green-100 text-green-700',
        };
    }

    if (assessment.status === 'reviewed' || (!isAssessor && assessment.status === 'submitted')) {
        return {
            label: 'For Review',
            className: 'bg-yellow-100 text-yellow-700',
        };
    }

    if (assessment.status === 'submitted') {
        return {
            label: 'Submitted',
            className: 'bg-blue-100 text-blue-700',
        };
    }

    return {
        label: 'Draft',
        className: 'bg-gray-100 text-gray-700',
    };
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [reviewNotification, setReviewNotification] = useState<Notification | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showCatalogRequestModal, setShowCatalogRequestModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [catalogRejectionReason, setCatalogRejectionReason] = useState('');
    const [approvalData, setApprovalData] = useState({
        role: 'member',
        projectPosition: '',
        department: '',
        section: '',
        team: '',
    });

    useGlobalModalPresence(showApprovalModal || showCatalogRequestModal);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isAdmin) {
                    // Fetch admin dashboard data
                    const [usersRes, notificationsRes, rolesRes, deptsRes, projectPositionRes, sectionsRes, teamsRes, skillsRes, alertsRes] = await Promise.all([
                        userService.getUsers({ limit: '100' }),
                        notificationService.getNotifications(),
                        roleService.getRoles(true),
                        departmentService.getDepartments(),
                        projectPositionService.getProjectPositions(),
                        sectionService.getSections(),
                        teamService.getTeams(),
                        skillService.getSkills(),
                        analyticsService.getOrganizationAlerts(),
                    ]);

                    const users = usersRes.data || [];
                    const notifications = notificationsRes.data || [];
                    const pendingApprovals = (notificationsRes.data || []).filter(
                        (notification) => notification.type === 'new_user_registration' && !notification.isActioned
                    );
                    const pendingCatalogRequests = notifications.filter(
                        (notification) =>
                            notification.type === 'general' &&
                            notification.title === 'Skill catalog request' &&
                            !notification.isActioned
                    );
                    const rolesWithoutOrganizationAssignment = (rolesRes.data || []).filter(
                        (role: RoleOption) =>
                            role.key !== 'member' &&
                            role.key !== 'admin' &&
                            (!role.organizationScopes || role.organizationScopes.length === 0)
                    );
                    setAdminData({
                        totalUsers: usersRes.pagination?.total || users.length,
                        totalDepartments: (deptsRes.data || []).length,
                        totalSections: (sectionsRes.data || []).length,
                        totalTeams: (teamsRes.data || []).length,
                        totalSkills: (skillsRes.data || []).length,
                        departments: deptsRes.data || [],
                        projectPositions: projectPositionRes.data || [],
                        sections: sectionsRes.data || [],
                        teams: teamsRes.data || [],
                        recentUsers: users.slice(0, 10),
                        pendingApprovals: pendingApprovals.slice(0, 10),
                        pendingCatalogRequests: pendingCatalogRequests.slice(0, 10),
                        pendingApprovalCount: pendingApprovals.length,
                        pendingCatalogRequestCount: pendingCatalogRequests.length,
                        pendingAdminActionCount:
                            pendingApprovals.length +
                            pendingCatalogRequests.length +
                            rolesWithoutOrganizationAssignment.length,
                        rolesWithoutOrganizationAssignment,
                        organizationAlerts: alertsRes.data || {
                            usersWithoutTeam: [],
                            usersWithoutProjectPosition: [],
                            teamsWithoutSection: [],
                            sectionsWithoutDepartment: [],
                            summary: {
                                usersWithoutTeam: 0,
                                usersWithoutProjectPosition: 0,
                                teamsWithoutSection: 0,
                                sectionsWithoutDepartment: 0,
                            },
                        },
                    });
                } else {
                    // Fetch regular user dashboard data
                    const [skillsRes, assessmentsRes, feedbackRes] = await Promise.all([
                        userSkillService.getMySkills(),
                        assessmentService.getAssessments(),
                        feedbackService.getFeedback(),
                    ]);

                    setData({
                        skills: skillsRes.data || [],
                        assessments: assessmentsRes.data || [],
                        feedback: feedbackRes.data || [],
                    });
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin]);

    useEffect(() => {
        if (!showApprovalModal || !isAdmin) {
            return;
        }

        const fetchApprovalOptions = async () => {
            const [roleRes] = await Promise.all([
                roleService.getRoles(),
            ]);

            if (roleRes.success) {
                const sortedRoles = (roleRes.data || [])
                    .sort((a: RoleOption, b: RoleOption) => a.level - b.level);
                setRoles(sortedRoles);
            }
        };

        fetchApprovalOptions();
    }, [showApprovalModal, isAdmin]);

    if (loading) {
        return <LoadingSpinner />;
    }

    const openApprovalModal = (notification: Notification) => {
        setReviewNotification(notification);
        setApprovalData({ role: 'member', projectPosition: '', department: '', section: '', team: '' });
        setShowApprovalModal(true);
    };

    const openCatalogRequestModal = (notification: Notification) => {
        setReviewNotification(notification);
        setCatalogRejectionReason('');
        setShowCatalogRequestModal(true);
    };

    const closeApprovalModal = () => {
        setShowApprovalModal(false);
        setReviewNotification(null);
        setActionLoading(false);
    };

    const closeCatalogRequestModal = () => {
        setShowCatalogRequestModal(false);
        setReviewNotification(null);
        setCatalogRejectionReason('');
        setActionLoading(false);
    };

    const handleApprovePendingUser = async () => {
        if (!reviewNotification || !adminData) return;

        setActionLoading(true);
        try {
            const approvedUserName = `${reviewNotification.relatedUser?.firstName || ''} ${reviewNotification.relatedUser?.lastName || ''}`.trim() || 'The user';
            const result = await notificationService.approveUser(reviewNotification._id, approvalData);
            if (!result.success) return;

            setAdminData({
                ...adminData,
                pendingApprovals: adminData.pendingApprovals.filter((notification) => notification._id !== reviewNotification._id),
                pendingApprovalCount: Math.max(0, adminData.pendingApprovalCount - 1),
                pendingAdminActionCount: Math.max(0, adminData.pendingAdminActionCount - 1),
            });
            closeApprovalModal();
            setSuccessMessage(`${approvedUserName} was approved successfully.`);
        } catch (error) {
            console.error('Failed to approve user:', error);
            setActionLoading(false);
        }
    };

    const handleRejectPendingUser = async () => {
        if (!reviewNotification || !adminData) return;
        if (!window.confirm('Are you sure you want to reject this user registration? This will delete the user account.')) {
            return;
        }

        setActionLoading(true);
        try {
            const rejectedUserName = `${reviewNotification.relatedUser?.firstName || ''} ${reviewNotification.relatedUser?.lastName || ''}`.trim() || 'The user';
            const result = await notificationService.rejectUser(reviewNotification._id);
            if (!result.success) return;

            setAdminData({
                ...adminData,
                pendingApprovals: adminData.pendingApprovals.filter((notification) => notification._id !== reviewNotification._id),
                pendingApprovalCount: Math.max(0, adminData.pendingApprovalCount - 1),
                pendingAdminActionCount: Math.max(0, adminData.pendingAdminActionCount - 1),
            });
            closeApprovalModal();
            setSuccessMessage(`${rejectedUserName} was rejected successfully.`);
        } catch (error) {
            console.error('Failed to reject user:', error);
            setActionLoading(false);
        }
    };

    const handleAcceptCatalogRequest = async () => {
        if (!reviewNotification || !adminData) return;

        setActionLoading(true);
        try {
            const result = await notificationService.acceptCatalogRequest(reviewNotification._id);
            if (!result.success) return;

            const catalogRequest = reviewNotification.metadata?.catalogRequest;

            setAdminData({
                ...adminData,
                pendingCatalogRequests: adminData.pendingCatalogRequests.filter((notification) => notification._id !== reviewNotification._id),
                pendingCatalogRequestCount: Math.max(0, adminData.pendingCatalogRequestCount - 1),
                pendingAdminActionCount: Math.max(0, adminData.pendingAdminActionCount - 1),
            });
            closeCatalogRequestModal();
            navigate('/skills', {
                state: {
                    catalogRequestPrefill: {
                        notificationId: reviewNotification._id,
                        categoryName: catalogRequest?.categoryName || '',
                        skillName: catalogRequest?.skillName || '',
                        existingCategoryId: catalogRequest?.existingCategoryId || '',
                        existingCategoryName: catalogRequest?.existingCategoryName || '',
                        details: catalogRequest?.details || '',
                    },
                },
            });
        } catch (error) {
            console.error('Failed to accept catalog request:', error);
            setActionLoading(false);
        }
    };

    const handleRejectCatalogRequest = async () => {
        if (!reviewNotification || !adminData || !catalogRejectionReason.trim()) return;

        setActionLoading(true);
        try {
            const result = await notificationService.rejectCatalogRequest(
                reviewNotification._id,
                catalogRejectionReason.trim()
            );
            if (!result.success) return;

            const requesterName =
                `${reviewNotification.relatedUser?.firstName || ''} ${reviewNotification.relatedUser?.lastName || ''}`.trim() || 'The requester';

            setAdminData({
                ...adminData,
                pendingCatalogRequests: adminData.pendingCatalogRequests.filter((notification) => notification._id !== reviewNotification._id),
                pendingCatalogRequestCount: Math.max(0, adminData.pendingCatalogRequestCount - 1),
                pendingAdminActionCount: Math.max(0, adminData.pendingAdminActionCount - 1),
            });
            closeCatalogRequestModal();
            setSuccessMessage(`${requesterName} was notified that the catalog request was rejected.`);
        } catch (error) {
            console.error('Failed to reject catalog request:', error);
            setActionLoading(false);
        }
    };

    // Admin Dashboard
    if (isAdmin && adminData) {
        const totalOrganizationIssues =
            adminData.organizationAlerts.summary.usersWithoutTeam +
            adminData.organizationAlerts.summary.usersWithoutProjectPosition +
            adminData.organizationAlerts.summary.teamsWithoutSection +
            adminData.organizationAlerts.summary.sectionsWithoutDepartment;
        const averageUsersPerTeam = adminData.totalTeams ? (adminData.totalUsers / adminData.totalTeams).toFixed(1) : '0.0';
        const averageTeamsPerSection = adminData.totalSections ? (adminData.totalTeams / adminData.totalSections).toFixed(1) : '0.0';
        const averageSectionsPerDepartment = adminData.totalDepartments ? (adminData.totalSections / adminData.totalDepartments).toFixed(1) : '0.0';
        const systemHealthScore = Math.max(0, 100 - (totalOrganizationIssues * 5 + adminData.pendingAdminActionCount * 3));
        const adminActionBreakdown = [
            { label: 'Registration approvals', count: adminData.pendingApprovalCount, color: 'bg-amber-500' },
            { label: 'Catalog requests', count: adminData.pendingCatalogRequestCount, color: 'bg-blue-500' },
            { label: 'Role management gaps', count: adminData.rolesWithoutOrganizationAssignment.length, color: 'bg-purple-500' },
        ];
        const organizationIssueBreakdown = [
            { label: 'Users without team', count: adminData.organizationAlerts.summary.usersWithoutTeam, color: 'bg-blue-500' },
            { label: 'Users without company position', count: adminData.organizationAlerts.summary.usersWithoutProjectPosition, color: 'bg-slate-500' },
            { label: 'Teams without section', count: adminData.organizationAlerts.summary.teamsWithoutSection, color: 'bg-violet-500' },
            { label: 'Sections without department', count: adminData.organizationAlerts.summary.sectionsWithoutDepartment, color: 'bg-red-500' },
        ];
        const maxAdminActionCount = Math.max(...adminActionBreakdown.map((item) => item.count), 1);
        const maxOrganizationIssueCount = Math.max(...organizationIssueBreakdown.map((item) => item.count), 1);

        return (
            <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-800 to-blue-900 text-white shadow-sm">
                    <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-100/80">Admin Dashboard</p>
                            <h1 className="mt-2 text-3xl font-bold">
                                Welcome back, {user?.firstName}.
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-200/90">
                                Monitor organization setup, resolve pending actions, and keep the SkillMatrix system clean and assignable.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                    <ShieldCheckIcon className="h-4 w-4" />
                                    System Administrator
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                    <BuildingOfficeIcon className="h-4 w-4" />
                                    {adminData.totalDepartments} departments
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                    <RectangleStackIcon className="h-4 w-4" />
                                    {adminData.totalSections} sections
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                    <UserGroupIcon className="h-4 w-4" />
                                    {adminData.totalTeams} teams
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Users</p>
                                <p className="mt-3 text-3xl font-bold">{adminData.totalUsers}</p>
                                <p className="mt-1 text-sm text-slate-200/80">Active organization records</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Skills</p>
                                <p className="mt-3 text-3xl font-bold">{adminData.totalSkills}</p>
                                <p className="mt-1 text-sm text-slate-200/80">Catalog entries available</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Pending Actions</p>
                                <p className="mt-3 text-3xl font-bold">{adminData.pendingAdminActionCount}</p>
                                <p className="mt-1 text-sm text-slate-200/80">Items waiting for admin review</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Org Alerts</p>
                                <p className="mt-3 text-3xl font-bold">
                                    {adminData.organizationAlerts.summary.usersWithoutTeam +
                                        adminData.organizationAlerts.summary.usersWithoutProjectPosition +
                                        adminData.organizationAlerts.summary.teamsWithoutSection +
                                        adminData.organizationAlerts.summary.sectionsWithoutDepartment}
                                </p>
                                <p className="mt-1 text-sm text-slate-200/80">Assignment and setup issues detected</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">System Health</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{systemHealthScore}%</p>
                                <p className="mt-1 text-sm text-gray-500">Based on current alerts and pending actions</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 p-3">
                                <ShieldCheckIcon className="h-7 w-7 text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Users Per Team</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{averageUsersPerTeam}</p>
                                <p className="mt-1 text-sm text-gray-500">Average staffing by current team count</p>
                            </div>
                            <div className="rounded-2xl bg-blue-50 p-3">
                                <UsersIcon className="h-7 w-7 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Teams Per Section</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{averageTeamsPerSection}</p>
                                <p className="mt-1 text-sm text-gray-500">Useful for structure balancing</p>
                            </div>
                            <div className="rounded-2xl bg-violet-50 p-3">
                                <UserGroupIcon className="h-7 w-7 text-violet-600" />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Sections Per Department</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{averageSectionsPerDepartment}</p>
                                <p className="mt-1 text-sm text-gray-500">Current organizational spread</p>
                            </div>
                            <div className="rounded-2xl bg-cyan-50 p-3">
                                <RectangleStackIcon className="h-7 w-7 text-cyan-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className="card">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Pending Action Report</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    See which admin queues are creating the most current workload.
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                {adminData.pendingAdminActionCount} open
                            </span>
                        </div>

                        <div className="mt-5 space-y-4">
                            {adminActionBreakdown.map((item) => (
                                <div key={item.label}>
                                    <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-gray-700">{item.label}</span>
                                        <span className="text-gray-500">{item.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full ${item.color}`}
                                            style={{ width: `${item.count === 0 ? 0 : (item.count / maxAdminActionCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                            {adminData.pendingAdminActionCount > 0
                                ? 'Clearing approvals and catalog requests first will reduce the highest share of current admin work.'
                                : 'No pending admin queues at the moment. This is a good time to review structure quality and roles.'}
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Organization Readiness Report</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Track assignment gaps that affect reporting lines and user setup quality.
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                {totalOrganizationIssues} issues
                            </span>
                        </div>

                        <div className="mt-5 space-y-4">
                            {organizationIssueBreakdown.map((item) => (
                                <div key={item.label}>
                                    <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-gray-700">{item.label}</span>
                                        <span className="text-gray-500">{item.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full ${item.color}`}
                                            style={{ width: `${item.count === 0 ? 0 : (item.count / maxOrganizationIssueCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Catalog Coverage</p>
                                <p className="mt-2 text-xl font-bold text-gray-900">{adminData.totalSkills}</p>
                                <p className="mt-1 text-sm text-gray-500">Skills available for matrix usage</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unscoped Roles</p>
                                <p className="mt-2 text-xl font-bold text-gray-900">{adminData.rolesWithoutOrganizationAssignment.length}</p>
                                <p className="mt-1 text-sm text-gray-500">Roles still missing org management rules</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent Users</p>
                                <p className="mt-2 text-xl font-bold text-gray-900">{adminData.recentUsers.length}</p>
                                <p className="mt-1 text-sm text-gray-500">Latest users visible on this dashboard</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin Quick Actions */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <Link to="/users" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <UsersIcon className="h-8 w-8 text-blue-600 mb-2" />
                            <p className="font-medium text-gray-900">Manage Users</p>
                            <p className="text-xs text-gray-500">Assign roles & teams</p>
                        </Link>
                        <Link to="/departments" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <BuildingOfficeIcon className="h-8 w-8 text-cyan-600 mb-2" />
                            <p className="font-medium text-gray-900">Departments</p>
                            <p className="text-xs text-gray-500">Create & organize</p>
                        </Link>
                        <Link to="/sections" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <RectangleStackIcon className="h-8 w-8 text-blue-600 mb-2" />
                            <p className="font-medium text-gray-900">Sections</p>
                            <p className="text-xs text-gray-500">Group teams cleanly</p>
                        </Link>
                        <Link to="/teams" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <UserGroupIcon className="h-8 w-8 text-violet-600 mb-2" />
                            <p className="font-medium text-gray-900">Teams</p>
                            <p className="text-xs text-gray-500">Create & assign</p>
                        </Link>
                        <Link to="/project-position" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <BriefcaseIcon className="h-8 w-8 text-blue-900 mb-2" />
                            <p className="font-medium text-gray-900">Company Positions</p>
                            <p className="text-xs text-gray-500">Manage assignments</p>
                        </Link>
                        <Link to="/skills" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <AcademicCapIcon className="h-8 w-8 text-orange-600 mb-2" />
                            <p className="font-medium text-gray-900">Skills</p>
                            <p className="text-xs text-gray-500">Define skill matrix</p>
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BellAlertIcon className="h-5 w-5 text-amber-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Organization Alerts</h2>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {adminData.organizationAlerts.summary.usersWithoutTeam +
                                adminData.organizationAlerts.summary.usersWithoutProjectPosition +
                                adminData.organizationAlerts.summary.teamsWithoutSection +
                                adminData.organizationAlerts.summary.sectionsWithoutDepartment} issues
                        </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-medium text-gray-900">Users Without Team</h3>
                                </div>
                                <Link to="/users" className="text-sm text-primary-600 hover:underline">
                                    View All
                                </Link>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-3">
                                {adminData.organizationAlerts.summary.usersWithoutTeam}
                            </p>
                            {adminData.organizationAlerts.usersWithoutTeam.length > 0 ? (
                                <div className="space-y-2">
                                    {adminData.organizationAlerts.usersWithoutTeam.slice(0, 5).map((u) => (
                                        <Link
                                            key={u._id || u.id}
                                            to={`/users/${u._id || u.id}`}
                                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100"
                                        >
                                            <span className="text-sm font-medium text-gray-900">
                                                {u.firstName} {u.lastName}
                                            </span>
                                            {u.department ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                    {typeof u.department === 'string' ? u.department : u.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">No department</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No users missing a team.</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <BriefcaseIcon className="h-5 w-5 text-blue-900" />
                                    <h3 className="font-medium text-gray-900">Users Without Company Positions</h3>
                                </div>
                                <Link to="/users" className="text-sm text-primary-600 hover:underline">
                                    View All
                                </Link>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-3">
                                {adminData.organizationAlerts.summary.usersWithoutProjectPosition}
                            </p>
                            {adminData.organizationAlerts.usersWithoutProjectPosition.length > 0 ? (
                                <div className="space-y-2">
                                    {adminData.organizationAlerts.usersWithoutProjectPosition.slice(0, 5).map((u) => (
                                        <Link
                                            key={u._id || u.id}
                                            to={`/users/${u._id || u.id}`}
                                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100"
                                        >
                                            <span className="text-sm font-medium text-gray-900">
                                                {u.firstName} {u.lastName}
                                            </span>
                                            {u.department ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                    {typeof u.department === 'string' ? u.department : u.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">No department</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No users missing company positions.</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <UserGroupIcon className="h-5 w-5 text-violet-600" />
                                    <h3 className="font-medium text-gray-900">Teams Without Section</h3>
                                </div>
                                <Link to="/teams" className="text-sm text-primary-600 hover:underline">
                                    View All
                                </Link>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-3">
                                {adminData.organizationAlerts.summary.teamsWithoutSection}
                            </p>
                            {adminData.organizationAlerts.teamsWithoutSection.length > 0 ? (
                                <div className="space-y-2">
                                    {adminData.organizationAlerts.teamsWithoutSection.slice(0, 5).map((team) => (
                                        <Link
                                            key={team._id}
                                            to={`/teams/${team._id}`}
                                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100"
                                        >
                                            <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                                <UserGroupIcon className="h-3.5 w-3.5" />
                                                {team.name}
                                            </span>
                                            {team.department ? (
                                                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                    {typeof team.department === 'string' ? team.department : team.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">No department</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No teams missing a section.</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <RectangleStackIcon className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-medium text-gray-900">Sections Without Department</h3>
                                </div>
                                <Link to="/sections" className="text-sm text-primary-600 hover:underline">
                                    View All
                                </Link>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-3">
                                {adminData.organizationAlerts.summary.sectionsWithoutDepartment}
                            </p>
                            {adminData.organizationAlerts.sectionsWithoutDepartment.length > 0 ? (
                                <div className="space-y-2">
                                    {adminData.organizationAlerts.sectionsWithoutDepartment.slice(0, 5).map((section) => (
                                        <div
                                            key={section._id}
                                            className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2"
                                        >
                                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                <RectangleStackIcon className="h-3.5 w-3.5" />
                                                {section.name}
                                            </span>
                                            <span className="text-xs text-red-600">Missing department</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No sections missing a department.</p>
                            )}
                        </div>
                    </div>

                    {adminData.organizationAlerts.summary.sectionsWithoutDepartment > 0 && (
                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                            <p>
                                Sections are expected to belong to a department. If this list is not empty, the data is orphaned and should be corrected.
                            </p>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Pending Admin Actions</h2>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {adminData.pendingAdminActionCount} pending
                        </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5 text-amber-600" />
                                    <h3 className="font-medium text-gray-900">Registration Approvals</h3>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {adminData.pendingApprovalCount} pending
                                </span>
                            </div>

                            {adminData.pendingApprovals.length > 0 ? (
                                <div className="space-y-1.5">
                                    {adminData.pendingApprovals.map((notification) => (
                                        <button
                                            key={notification._id}
                                            type="button"
                                            onClick={() => openApprovalModal(notification)}
                                            className="w-full flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors text-left"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {notification.relatedUser?.firstName} {notification.relatedUser?.lastName}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">{notification.relatedUser?.email}</p>
                                            </div>
                                            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                                Awaiting approval
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No pending registration approvals.</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <AcademicCapIcon className="h-5 w-5 text-blue-700" />
                                    <h3 className="font-medium text-gray-900">Skill Catalog Requests</h3>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {adminData.pendingCatalogRequestCount} requests
                                </span>
                            </div>

                            {adminData.pendingCatalogRequests.length > 0 ? (
                                <div className="space-y-1.5">
                                    {adminData.pendingCatalogRequests.map((notification) => (
                                        <button
                                            key={notification._id}
                                            type="button"
                                            onClick={() => openCatalogRequestModal(notification)}
                                            className="w-full flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-left transition-colors hover:bg-blue-100"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    Skill catalog request
                                                </p>
                                                <p className="mt-1 text-xs text-gray-600">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            <span className="ml-3 inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                Review request
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No pending skill catalog requests.</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
                                    <h3 className="font-medium text-gray-900">Role Management Gaps</h3>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {adminData.rolesWithoutOrganizationAssignment.length} unassigned
                                </span>
                            </div>

                            {adminData.rolesWithoutOrganizationAssignment.length > 0 ? (
                                <div className="space-y-1.5">
                                    {adminData.rolesWithoutOrganizationAssignment.slice(0, 6).map((role) => (
                                        <Link
                                            key={role._id}
                                            to="/roles"
                                            className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{role.name}</p>
                                                <p className="text-xs text-gray-600 font-mono truncate">{role.key}</p>
                                            </div>
                                            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                                No organization scope
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">All applicable roles have organization management assigned.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Users */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
                        <Link to="/users" className="text-sm text-primary-600 hover:underline">
                            View All →
                        </Link>
                    </div>
                    {adminData.recentUsers.length > 0 ? (
                        <div className="space-y-3">
                            {adminData.recentUsers.map((u) => (
                                <Link
                                    key={u._id || u.id}
                                    to={`/users/${u._id || u.id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                            <span className="text-primary-600 font-semibold">
                                                {u.firstName[0]}{u.lastName[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {u.department && (
                                            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                {typeof u.department === 'string' ? u.department : u.department.name}
                                            </span>
                                        )}
                                        {typeof u.team === 'object' && u.team?.section && (
                                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                <RectangleStackIcon className="h-3.5 w-3.5" />
                                                {typeof u.team.section === 'string' ? u.team.section : u.team.section.name}
                                            </span>
                                        )}
                                        {u.team && (
                                            <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                                <UserGroupIcon className="h-3.5 w-3.5" />
                                                {typeof u.team === 'string' ? u.team : u.team.name}
                                            </span>
                                        )}
                                        {u.projectPosition && (
                                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-900">
                                                <BriefcaseIcon className="h-3.5 w-3.5" />
                                                {typeof u.projectPosition === 'string' ? u.projectPosition : u.projectPosition.name}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                                            {ROLE_LABELS[u.role]}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <UsersIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>No users yet</p>
                        </div>
                    )}
                </div>
            </div>

            {showApprovalModal && reviewNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Review Registration</h3>
                            <button
                                onClick={closeApprovalModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="px-6 py-4">
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">New User</p>
                                <p className="font-medium text-gray-900">
                                    {reviewNotification.relatedUser?.firstName} {reviewNotification.relatedUser?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {reviewNotification.relatedUser?.email}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={approvalData.role}
                                        onChange={(e) => setApprovalData({ ...approvalData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {roles.map((role) => (
                                            <option key={role._id} value={role.key}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Position (Optional)
                                    </label>
                                    <select
                                        value={approvalData.projectPosition}
                                        onChange={(e) => setApprovalData({ ...approvalData, projectPosition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Company Position</option>
                                        {adminData.projectPositions.map((projectPosition) => (
                                            <option key={projectPosition._id} value={projectPosition._id}>
                                                {projectPosition.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department (Optional)
                                    </label>
                                    <select
                                        value={approvalData.department}
                                        onChange={(e) => setApprovalData({ ...approvalData, department: e.target.value, section: '', team: '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Department</option>
                                        {adminData.departments.map((department) => (
                                            <option key={department._id} value={department._id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Section (Optional)
                                    </label>
                                    <select
                                        value={approvalData.section}
                                        onChange={(e) => setApprovalData({ ...approvalData, section: e.target.value, team: '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        disabled={!approvalData.department}
                                    >
                                        <option value="">Select Section</option>
                                        {adminData.sections
                                            .filter((section) => {
                                                const departmentId =
                                                    typeof section.department === 'string'
                                                        ? section.department
                                                        : section.department?._id;
                                                return departmentId === approvalData.department;
                                            })
                                            .map((section) => (
                                                <option key={section._id} value={section._id}>
                                                    {section.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Team (Optional)
                                    </label>
                                    <select
                                        value={approvalData.team}
                                        onChange={(e) => setApprovalData({ ...approvalData, team: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        disabled={!approvalData.department}
                                    >
                                        <option value="">Select Team</option>
                                        {adminData.teams
                                            .filter((team) => {
                                                const departmentId =
                                                    typeof team.department === 'string'
                                                        ? team.department
                                                        : team.department?._id;
                                                const sectionId =
                                                    typeof team.section === 'string'
                                                        ? team.section
                                                        : team.section?._id;
                                                return departmentId === approvalData.department &&
                                                    (!approvalData.section || sectionId === approvalData.section);
                                            })
                                            .map((team) => (
                                                <option key={team._id} value={team._id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
                            <button
                                onClick={handleRejectPendingUser}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <XMarkIcon className="h-5 w-5" />
                                Reject
                            </button>
                            <button
                                onClick={handleApprovePendingUser}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                <CheckIcon className="h-5 w-5" />
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCatalogRequestModal && reviewNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Review Skill Catalog Request</h3>
                            <button
                                onClick={closeCatalogRequestModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div className="rounded-lg bg-blue-50 p-4">
                                <p className="text-sm text-blue-700 mb-1">Requested by</p>
                                <p className="font-medium text-gray-900">
                                    {reviewNotification.relatedUser?.firstName} {reviewNotification.relatedUser?.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {reviewNotification.relatedUser?.email}
                                </p>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Request Details</p>
                                <p className="text-sm leading-6 text-gray-700 whitespace-pre-line">
                                    {reviewNotification.message}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason
                                </label>
                                <textarea
                                    value={catalogRejectionReason}
                                    onChange={(e) => setCatalogRejectionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    rows={4}
                                    placeholder="Required only if you reject this request."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    If you reject the request, this reason will be sent to the requester.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
                            <button
                                onClick={handleRejectCatalogRequest}
                                disabled={actionLoading || !catalogRejectionReason.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <XMarkIcon className="h-5 w-5" />
                                Reject
                            </button>
                            <button
                                onClick={handleAcceptCatalogRequest}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                <CheckIcon className="h-5 w-5" />
                                Accept and Open Skills
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SuccessDialog
                isOpen={!!successMessage}
                onClose={() => setSuccessMessage('')}
                title="Action Completed"
                message={successMessage}
            />
            </>
        );
    }

    // Regular User Dashboard
    if (!data) {
        return <div className="text-center text-gray-500">Failed to load dashboard</div>;
    }

    const currentUserId = user?._id || user?.id;
    const totalSkills = data.skills.length;
    const totalEndorsements = data.skills.reduce((sum, skill) => sum + (skill.endorsementCount || 0), 0);
    const publicSkills = data.skills.filter((skill) => skill.isPublic).length;
    const averageProficiency = totalSkills
        ? Math.round((data.skills.reduce((sum, skill) => sum + Number(skill.proficiencyLevel), 0) / totalSkills) * 10) / 10
        : 0;

    const receivedAssessments = data.assessments.filter(
        (assessment) => assessment.assessee._id === currentUserId || assessment.assessee.id === currentUserId
    );
    const givenAssessments = data.assessments.filter(
        (assessment) => assessment.assessor._id === currentUserId || assessment.assessor.id === currentUserId
    );
    const pendingAssessmentReviews = receivedAssessments.filter(
        (assessment) => !assessment.assesseeAcknowledged && (assessment.status === 'submitted' || assessment.status === 'reviewed')
    ).length;
    const completedAssessments = receivedAssessments.filter(
        (assessment) => assessment.assesseeAcknowledged || assessment.status === 'completed'
    ).length;

    const receivedFeedback = data.feedback.filter(
        (feedback) => feedback.receiver._id === currentUserId || feedback.receiver.id === currentUserId
    );
    const givenFeedback = data.feedback.filter(
        (feedback) => feedback.giver._id === currentUserId || feedback.giver.id === currentUserId
    );
    const pendingFeedbackAcknowledgements = receivedFeedback.filter((feedback) => !feedback.isAcknowledged).length;

    const teamName = user?.team ? (typeof user.team === 'string' ? user.team : user.team.name) : 'Not assigned';
    const sectionName =
        user?.team && typeof user.team !== 'string' && user.team.section && typeof user.team.section !== 'string'
            ? user.team.section.name
            : 'Not assigned';
    const deptName = user?.department ? (typeof user.department === 'string' ? user.department : user.department.name) : 'Not assigned';
    const roleLabel = ROLE_LABELS[user?.role as UserRole] || 'Team Member';

    const sortedSkills = [...data.skills].sort((a, b) => {
        if (b.proficiencyLevel !== a.proficiencyLevel) {
            return Number(b.proficiencyLevel) - Number(a.proficiencyLevel);
        }

        return (b.endorsementCount || 0) - (a.endorsementCount || 0);
    });

    const topEndorsedSkills = [...data.skills]
        .sort((a, b) => (b.endorsementCount || 0) - (a.endorsementCount || 0))
        .slice(0, 4);

    const categoryInsights = Object.values(
        data.skills.reduce((acc, userSkill) => {
            const category = typeof userSkill.skill.category === 'string'
                ? { _id: userSkill.skill.category, name: userSkill.skill.category, color: '#94A3B8' }
                : userSkill.skill.category;
            const categoryId = category?._id || 'uncategorized';

            if (!acc[categoryId]) {
                acc[categoryId] = {
                    id: categoryId,
                    name: category?.name || 'Uncategorized',
                    color: category?.color || '#94A3B8',
                    count: 0,
                    endorsements: 0,
                };
            }

            acc[categoryId].count += 1;
            acc[categoryId].endorsements += userSkill.endorsementCount || 0;
            return acc;
        }, {} as Record<string, { id: string; name: string; color: string; count: number; endorsements: number }>)
    ).sort((left, right) => right.count - left.count);

    const maxCategoryCount = Math.max(...categoryInsights.map((item) => item.count), 1);

    const proficiencyDistribution = [...PROFICIENCY_LEVELS]
        .sort((left, right) => right - left)
        .map((level) => ({
            level,
            label: PROFICIENCY_LABELS[level],
            count: data.skills.filter((skill) => skill.proficiencyLevel === level).length,
        }));

    const maxProficiencyCount = Math.max(...proficiencyDistribution.map((item) => item.count), 1);

    const feedbackByType = Object.entries(
        receivedFeedback.reduce((acc, feedback) => {
            acc[feedback.type] = (acc[feedback.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    )
        .map(([type, count]) => ({
            type,
            label: FEEDBACK_TYPE_LABELS[type as keyof typeof FEEDBACK_TYPE_LABELS] || type,
            count,
        }))
        .sort((left, right) => right.count - left.count);

    const recentAssessments = [...data.assessments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

    const recentFeedback = [...receivedFeedback]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

    const strongestSkill = sortedSkills[0];
    const mostActiveCategory = categoryInsights[0];
    const attentionCount = pendingAssessmentReviews + pendingFeedbackAcknowledgements;

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 text-white shadow-sm">
                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-100/80">User Dashboard</p>
                        <h1 className="mt-2 text-3xl font-bold">
                            Welcome back, {user?.firstName}.
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
                            Track your current matrix progress, review activity, and skill signals based on your existing
                            assessments, feedback, and endorsements.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                <ShieldCheckIcon className="h-4 w-4" />
                                {roleLabel}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                <BuildingOfficeIcon className="h-4 w-4" />
                                {deptName}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                <RectangleStackIcon className="h-4 w-4" />
                                {sectionName}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                <UserGroupIcon className="h-4 w-4" />
                                {teamName}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Skills</p>
                            <p className="mt-3 text-3xl font-bold">{totalSkills}</p>
                            <p className="mt-1 text-sm text-blue-100/80">Tracked on your matrix</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Avg Level</p>
                            <p className="mt-3 text-3xl font-bold">{averageProficiency || '-'}</p>
                            <p className="mt-1 text-sm text-blue-100/80">Across current skill entries</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Public Skills</p>
                            <p className="mt-3 text-3xl font-bold">{publicSkills}</p>
                            <p className="mt-1 text-sm text-blue-100/80">Visible to other members</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Attention</p>
                            <p className="mt-3 text-3xl font-bold">{attentionCount}</p>
                            <p className="mt-1 text-sm text-blue-100/80">Items waiting for your action</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Skills Tracked</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{totalSkills}</p>
                            <p className="mt-1 text-sm text-gray-500">Current matrix coverage</p>
                        </div>
                        <div className="rounded-2xl bg-primary-50 p-3">
                            <AcademicCapIcon className="h-7 w-7 text-primary-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Endorsements Earned</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{totalEndorsements}</p>
                            <p className="mt-1 text-sm text-gray-500">Signals from teammates</p>
                        </div>
                        <div className="rounded-2xl bg-green-50 p-3">
                            <HandThumbUpIcon className="h-7 w-7 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Assessments Received</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{receivedAssessments.length}</p>
                            <p className="mt-1 text-sm text-gray-500">{completedAssessments} acknowledged</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3">
                            <ClipboardDocumentCheckIcon className="h-7 w-7 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Needs Attention</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{attentionCount}</p>
                            <p className="mt-1 text-sm text-gray-500">Reviews and acknowledgements</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-3">
                            <ExclamationTriangleIcon className="h-7 w-7 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                <div className="card">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Skill Analytics</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                A quick view of your proficiency spread and category coverage.
                            </p>
                        </div>
                        <Link to="/my-skills" className="text-sm font-medium text-primary-600 hover:underline">
                            Open Matrix
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Proficiency Distribution</h3>
                            <div className="mt-4 space-y-3">
                                {proficiencyDistribution.map((item) => (
                                    <div key={item.level}>
                                        <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                                            <span className="font-medium text-gray-700">{item.label}</span>
                                            <span className="text-gray-500">{item.count}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-primary-500"
                                                style={{ width: `${item.count === 0 ? 0 : (item.count / maxProficiencyCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Category Coverage</h3>
                            <div className="mt-4 space-y-4">
                                {categoryInsights.length > 0 ? (
                                    categoryInsights.map((category) => (
                                        <div key={category.id}>
                                            <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                                                <div className="flex items-center gap-2 font-medium text-gray-700">
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                                                    {category.name}
                                                </div>
                                                <span className="text-gray-500">{category.count} skills</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${(category.count / maxCategoryCount) * 100}%`,
                                                        backgroundColor: category.color,
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">{category.endorsements} endorsements earned in this category</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                        No category data yet. Add skills to start building your matrix analytics.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 md:grid-cols-3">
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Strongest Skill</p>
                            <p className="mt-2 font-semibold text-gray-900">{strongestSkill?.skill.name || 'No skills yet'}</p>
                            <p className="mt-1 text-sm text-gray-500">
                                {strongestSkill
                                    ? `${PROFICIENCY_LABELS[strongestSkill.proficiencyLevel]} with ${strongestSkill.endorsementCount || 0} endorsements`
                                    : 'Add skills to see this highlight'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Most Active Category</p>
                            <p className="mt-2 font-semibold text-gray-900">{mostActiveCategory?.name || 'No category yet'}</p>
                            <p className="mt-1 text-sm text-gray-500">
                                {mostActiveCategory ? `${mostActiveCategory.count} skills recorded` : 'Category insight appears once you add skills'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reviews Given</p>
                            <p className="mt-2 font-semibold text-gray-900">{givenAssessments.length + givenFeedback.length}</p>
                            <p className="mt-1 text-sm text-gray-500">
                                {givenAssessments.length} assessments and {givenFeedback.length} feedback entries shared
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900">Review Analytics</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Monitor review work waiting on you and the kinds of feedback you are receiving.
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-amber-900">Assessment Reviews</p>
                                    <ClipboardDocumentCheckIcon className="h-5 w-5 text-amber-600" />
                                </div>
                                <p className="mt-3 text-2xl font-bold text-amber-900">{pendingAssessmentReviews}</p>
                                <p className="mt-1 text-sm text-amber-700">Waiting for your acknowledgement</p>
                            </div>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-blue-900">Feedback Acknowledgements</p>
                                    <BellAlertIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                <p className="mt-3 text-2xl font-bold text-blue-900">{pendingFeedbackAcknowledgements}</p>
                                <p className="mt-1 text-sm text-blue-700">Feedback items waiting for your response</p>
                            </div>
                        </div>

                        <div className="mt-5 border-t border-gray-100 pt-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Received Feedback by Type</h3>
                                <span className="text-xs text-gray-400">{receivedFeedback.length} total</span>
                            </div>
                            <div className="mt-3 space-y-3">
                                {feedbackByType.length > 0 ? (
                                    feedbackByType.map((item) => (
                                        <div key={item.type} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                                                {item.count}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                        No feedback received yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Most Endorsed Skills</h2>
                                <p className="mt-1 text-sm text-gray-500">Your top recognized skills right now.</p>
                            </div>
                            <Link to="/my-skills" className="text-sm font-medium text-primary-600 hover:underline">
                                View Skills
                            </Link>
                        </div>

                        <div className="mt-5 space-y-3">
                            {topEndorsedSkills.length > 0 ? (
                                topEndorsedSkills.map((userSkill) => (
                                    <div key={userSkill._id} className="rounded-xl border border-gray-100 px-4 py-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">{userSkill.skill.name}</p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {typeof userSkill.skill.category === 'string'
                                                        ? userSkill.skill.category
                                                        : userSkill.skill.category?.name || 'Uncategorized'}
                                                </p>
                                            </div>
                                            <ProficiencyBadge level={userSkill.proficiencyLevel} size="sm" />
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-sm">
                                            <span className="inline-flex items-center gap-2 text-green-700">
                                                <HandThumbUpIcon className="h-4 w-4" />
                                                {userSkill.endorsementCount || 0} endorsements
                                            </span>
                                            <span className="text-gray-500">{userSkill.yearsOfExperience}y experience</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                    Endorsements will appear here once teammates start recognizing your skills.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="card">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Recent Assessments</h2>
                            <p className="mt-1 text-sm text-gray-500">Latest assessment activity involving you.</p>
                        </div>
                        <Link to="/assessments" className="text-sm font-medium text-primary-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    <div className="mt-5 space-y-3">
                        {recentAssessments.length > 0 ? (
                            recentAssessments.map((assessment) => {
                                const isReceived =
                                    assessment.assessee._id === currentUserId || assessment.assessee.id === currentUserId;
                                const statusPresentation = getAssessmentStatusPresentation(assessment, currentUserId);

                                return (
                                    <div key={assessment._id} className="rounded-xl border border-gray-100 px-4 py-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {isReceived ? 'From' : 'To'}{' '}
                                                    {isReceived
                                                        ? `${assessment.assessor.firstName} ${assessment.assessor.lastName}`
                                                        : `${assessment.assessee.firstName} ${assessment.assessee.lastName}`}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {assessment.period} • {ASSESSMENT_TYPE_LABELS[assessment.type]}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-400">
                                                    {new Date(assessment.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPresentation.className}`}>
                                                {statusPresentation.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                No assessment activity yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Recent Feedback</h2>
                            <p className="mt-1 text-sm text-gray-500">Most recent feedback you have received.</p>
                        </div>
                        <Link to="/feedback" className="text-sm font-medium text-primary-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    <div className="mt-5 space-y-3">
                        {recentFeedback.length > 0 ? (
                            recentFeedback.map((item) => (
                                <div key={item._id} className="rounded-xl border border-gray-100 px-4 py-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-gray-900">{item.title}</p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                From {item.giver.firstName} {item.giver.lastName} • {FEEDBACK_TYPE_LABELS[item.type]}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {new Date(item.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                item.isAcknowledged ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}
                                        >
                                            {item.isAcknowledged ? 'Acknowledged' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                No feedback entries received yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Link to="/my-skills" className="card text-center transition-shadow hover:shadow-md">
                    <AcademicCapIcon className="mx-auto mb-3 h-8 w-8 text-primary-600" />
                    <p className="font-medium text-gray-900">Manage Skills</p>
                    <p className="mt-1 text-sm text-gray-500">Update your matrix</p>
                </Link>
                <Link to="/browse-matrix" className="card text-center transition-shadow hover:shadow-md">
                    <UsersIcon className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                    <p className="font-medium text-gray-900">Browse Matrix</p>
                    <p className="mt-1 text-sm text-gray-500">Explore team skills</p>
                </Link>
                <Link to="/assessments" className="card text-center transition-shadow hover:shadow-md">
                    <ClipboardDocumentCheckIcon className="mx-auto mb-3 h-8 w-8 text-green-600" />
                    <p className="font-medium text-gray-900">Assessments</p>
                    <p className="mt-1 text-sm text-gray-500">Review submissions</p>
                </Link>
                <Link to="/feedback" className="card text-center transition-shadow hover:shadow-md">
                    <ChartBarIcon className="mx-auto mb-3 h-8 w-8 text-purple-600" />
                    <p className="font-medium text-gray-900">Feedback</p>
                    <p className="mt-1 text-sm text-gray-500">Track recognition</p>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
