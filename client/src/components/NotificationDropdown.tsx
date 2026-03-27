import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon, XMarkIcon, UserPlusIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { notificationService, departmentService, projectPositionService, sectionService, teamService, roleService } from '../services';
import { Notification, Department, ProjectPosition, Section, Team } from '../types';
import { useGlobalModalPresence } from '../utils/globalModalState';

interface Role {
    _id: string;
    name: string;
    key: string;
    level: number;
}

interface NotificationDropdownProps {
    isAdmin: boolean;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [projectPositions, setProjectPositions] = useState<ProjectPosition[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [approvalData, setApprovalData] = useState({
        role: '',
        projectPosition: '',
        department: '',
        section: '',
        team: '',
    });
    const [actionLoading, setActionLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useGlobalModalPresence(showApprovalModal);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                notificationService.getNotifications(),
                notificationService.getUnreadCount(),
            ]);
            if (notifRes.success) {
                setNotifications(notifRes.data || []);
            }
            if (countRes.success) {
                setUnreadCount(countRes.data?.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    // Fetch on mount and periodically
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Fetch select options when modal opens
    useEffect(() => {
        if (showApprovalModal) {
            const fetchOptions = async () => {
                const [deptRes, projectPositionRes, sectionRes, teamRes, roleRes] = await Promise.all([
                    departmentService.getDepartments(),
                    projectPositionService.getProjectPositions(),
                    sectionService.getSections(),
                    teamService.getTeams(),
                    roleService.getRoles(),
                ]);
                if (deptRes.success) setDepartments(deptRes.data || []);
                if (projectPositionRes.success) setProjectPositions(projectPositionRes.data || []);
                if (sectionRes.success) setSections(sectionRes.data || []);
                if (teamRes.success) setTeams(teamRes.data || []);
                if (roleRes.success) {
                    const filtered = (roleRes.data || [])
                        .sort((a: Role, b: Role) => a.level - b.level);
                    setRoles(filtered);
                }
            };
            fetchOptions();
        }
    }, [showApprovalModal]);

    const handleOpenDropdown = async () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setLoading(true);
            await fetchNotifications();
            setLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const handleClearAll = async () => {
        await notificationService.clearAll();
        setNotifications([]);
        setUnreadCount(0);
        setIsOpen(false);
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.isRead) {
            await notificationService.markAsRead(notification._id);
            setNotifications(prev =>
                prev.map(n => (n._id === notification._id ? { ...n, isRead: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        // If it's a registration notification and not yet actioned, show approval modal
        if (notification.type === 'new_user_registration' && !notification.isActioned && isAdmin) {
            setSelectedNotification(notification);
            setApprovalData({ role: 'member', projectPosition: '', department: '', section: '', team: '' });
            setShowApprovalModal(true);
            setIsOpen(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedNotification) return;
        setActionLoading(true);
        try {
            const result = await notificationService.approveUser(selectedNotification._id, approvalData);
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n =>
                        n._id === selectedNotification._id
                            ? { ...n, isActioned: true, actionTaken: 'approved' }
                            : n
                    )
                );
                setShowApprovalModal(false);
                setSelectedNotification(null);
            }
        } catch (error) {
            console.error('Failed to approve user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedNotification) return;
        if (!window.confirm('Are you sure you want to reject this user registration? This will delete the user account.')) {
            return;
        }
        setActionLoading(true);
        try {
            const result = await notificationService.rejectUser(selectedNotification._id);
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n =>
                        n._id === selectedNotification._id
                            ? { ...n, isActioned: true, actionTaken: 'rejected' }
                            : n
                    )
                );
                setShowApprovalModal(false);
                setSelectedNotification(null);
            }
        } catch (error) {
            console.error('Failed to reject user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_user_registration':
                return <UserPlusIcon className="h-5 w-5 text-blue-500" />;
            case 'user_approved':
                return <CheckIcon className="h-5 w-5 text-green-500" />;
            case 'user_rejected':
                return <XMarkIcon className="h-5 w-5 text-red-500" />;
            case 'role_assigned':
                return <ShieldCheckIcon className="h-5 w-5 text-indigo-500" />;
            case 'assessment_received':
                return <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-500" />;
            case 'feedback_received':
                return <ChatBubbleLeftRightIcon className="h-5 w-5 text-amber-500" />;
            case 'general':
                return <HandThumbUpIcon className="h-5 w-5 text-gray-400" />;
            default:
                return <BellSolidIcon className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (notification: Notification) => {
        if (!notification.isActioned) return null;
        if (notification.actionTaken === 'approved') {
            return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approved</span>;
        }
        if (notification.actionTaken === 'rejected') {
            return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Rejected</span>;
        }
        return null;
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={handleOpenDropdown}
                    className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <div className="flex items-center gap-3">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Clear all
                                    </button>
                                )}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-sm text-primary-600 hover:text-primary-700"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-gray-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification._id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {notification.title}
                                                    </p>
                                                    {getStatusBadge(notification)}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="flex-shrink-0">
                                                    <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Approval Modal */}
            {showApprovalModal && selectedNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Review Registration</h3>
                            <button
                                onClick={() => setShowApprovalModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="px-6 py-4">
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">New User</p>
                                <p className="font-medium text-gray-900">
                                    {selectedNotification.relatedUser?.firstName}{' '}
                                    {selectedNotification.relatedUser?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {selectedNotification.relatedUser?.email}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={approvalData.role}
                                        onChange={e => setApprovalData({ ...approvalData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {roles.map(role => (
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
                                        onChange={e => setApprovalData({ ...approvalData, projectPosition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Company Position</option>
                                        {projectPositions.map(projectPosition => (
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
                                        onChange={e => setApprovalData({ ...approvalData, department: e.target.value, section: '', team: '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept._id}>
                                                {dept.name}
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
                                        onChange={e => setApprovalData({ ...approvalData, section: e.target.value, team: '' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        disabled={!approvalData.department}
                                    >
                                        <option value="">Select Section</option>
                                        {sections
                                            .filter(section => {
                                                const departmentId =
                                                    typeof section.department === 'string'
                                                        ? section.department
                                                        : section.department?._id;
                                                return departmentId === approvalData.department;
                                            })
                                            .map(section => (
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
                                        onChange={e => setApprovalData({ ...approvalData, team: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        disabled={!approvalData.department}
                                    >
                                        <option value="">Select Team</option>
                                        {teams
                                            .filter(t => {
                                                const deptId = typeof t.department === 'string' ? t.department : t.department?._id;
                                                const sectionId = typeof t.section === 'string' ? t.section : t.section?._id;
                                                return deptId === approvalData.department &&
                                                    (!approvalData.section || sectionId === approvalData.section);
                                            })
                                            .map(team => (
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
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <XMarkIcon className="h-5 w-5" />
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
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
        </>
    );
};

export default NotificationDropdown;
