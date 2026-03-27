import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import AppLogo from './AppLogo';
import { useHasGlobalModalOpen } from '../utils/globalModalState';
import {
    HomeIcon,
    UserIcon,
    AcademicCapIcon,
    UsersIcon,
    BuildingOfficeIcon,
    BriefcaseIcon,
    ChartBarIcon,
    Bars3Icon,
    XMarkIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentCheckIcon,
    ChatBubbleLeftRightIcon,
    ShieldCheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

type NavigationItem = {
    name: string;
    href?: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    adminOnly: boolean;
    hideForAdmin: boolean;
    children?: Array<{
        name: string;
        href?: string;
        disabled?: boolean;
    }>;
};

const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, adminOnly: false, hideForAdmin: false },
    {
        name: 'Organization',
        icon: BuildingOfficeIcon,
        adminOnly: true,
        hideForAdmin: false,
        children: [
            { name: 'Department', href: '/departments' },
            { name: 'Section', href: '/sections' },
            { name: 'Team', href: '/teams' },
        ],
    },
    { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, adminOnly: true, hideForAdmin: false },
    { name: 'Company Positions', href: '/project-position', icon: BriefcaseIcon, adminOnly: true, hideForAdmin: false },
    { name: 'Users', href: '/users', icon: UsersIcon, adminOnly: true, hideForAdmin: false },
    { name: 'Skills', href: '/skills', icon: AcademicCapIcon, adminOnly: true, hideForAdmin: false },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, adminOnly: true, hideForAdmin: false },
    { name: 'My Skills', href: '/my-skills', icon: AcademicCapIcon, adminOnly: false, hideForAdmin: true },
    { name: 'Browse Matrix', href: '/browse-matrix', icon: UsersIcon, adminOnly: false, hideForAdmin: true },
    { name: 'Assessments', href: '/assessments', icon: ClipboardDocumentCheckIcon, adminOnly: false, hideForAdmin: true },
    { name: 'Feedback', href: '/feedback', icon: ChatBubbleLeftRightIcon, adminOnly: false, hideForAdmin: true },
];

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const hasGlobalModalOpen = useHasGlobalModalOpen();
    const isAdmin = user?.role === 'admin';
    const filteredNavigation = navigation.filter(item => {
        if (isAdmin) {
            return !item.hideForAdmin;
        }
        return !item.adminOnly;
    });
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        Organization:
            location.pathname.startsWith('/departments') ||
            location.pathname.startsWith('/sections') ||
            location.pathname.startsWith('/teams'),
    });

    useEffect(() => {
        if (
            location.pathname.startsWith('/departments') ||
            location.pathname.startsWith('/sections') ||
            location.pathname.startsWith('/teams')
        ) {
            setOpenMenus((current) => ({
                ...current,
                Organization: true,
            }));
        }
    }, [location.pathname]);

    const toggleMenu = (name: string) => {
        setOpenMenus((current) => ({
            ...current,
            [name]: !current[name],
        }));
    };

    const isItemActive = (item: NavigationItem) => {
        if (item.href) {
            return location.pathname === item.href || location.pathname.startsWith(item.href + '/');
        }

        return item.children?.some((child) =>
            child.href ? location.pathname === child.href || location.pathname.startsWith(child.href + '/') : false
        ) || false;
    };

    const handleLogout = () => {
        logout();
    };

    const handleOpenProficiencyGuide = () => {
        window.dispatchEvent(new Event('open-proficiency-guide'));
    };

    const isGuideCompact = sidebarCollapsed || hasGlobalModalOpen;

    const proficiencyGuideButton = (
        <button
            type="button"
            onClick={handleOpenProficiencyGuide}
            title="View 9-level skill progression"
            className={`flex items-center rounded-xl border border-primary-100 bg-primary-50 text-primary-700 shadow-sm transition-colors hover:bg-primary-100 ${
                isGuideCompact ? 'justify-center p-3' : 'gap-3 px-3 py-3'
            }`}
        >
            <QuestionMarkCircleIcon className="h-6 w-6 flex-shrink-0" />
            {!isGuideCompact && (
                <div className="text-left">
                    <div className="text-sm font-semibold">9-Level Guide</div>
                    <div className="text-xs text-primary-600">Skill progression</div>
                </div>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white">
                    <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
                        <AppLogo to="/dashboard" />
                        <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                        <nav className="space-y-1">
                            {filteredNavigation.map((item) => {
                                const isActive = isItemActive(item);
                                const isOpen = openMenus[item.name];

                                if (item.children) {
                                    return (
                                        <div key={item.name} className="space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleMenu(item.name)}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                                    ? 'bg-primary-50 text-primary-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <item.icon className="h-5 w-5" />
                                                    {item.name}
                                                </span>
                                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="ml-4 border-l border-gray-200 pl-4 space-y-1">
                                                    {item.children.map((child) => {
                                                        const childActive = child.href ? location.pathname === child.href || location.pathname.startsWith(child.href + '/') : false;

                                                        if (child.disabled || !child.href) {
                                                            return (
                                                                <span
                                                                    key={child.name}
                                                                    className="flex items-center px-3 py-2 rounded-md text-sm text-gray-400 cursor-default"
                                                                >
                                                                    {child.name}
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <Link
                                                                key={child.name}
                                                                to={child.href}
                                                                onClick={() => setSidebarOpen(false)}
                                                                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${childActive
                                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                                    }`}
                                                            >
                                                                {child.name}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href || '#'}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="mt-auto pt-4">
                            {proficiencyGuideButton}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
                <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
                    <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
                        <AppLogo to="/dashboard" compact={sidebarCollapsed} />
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className={`p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`}
                            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed ? (
                                <ChevronRightIcon className="h-5 w-5" />
                            ) : (
                                <ChevronLeftIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                        <nav className="space-y-1">
                            {filteredNavigation.map((item) => {
                                const isActive = isItemActive(item);
                                const isOpen = openMenus[item.name];

                                if (item.children) {
                                    return (
                                        <div key={item.name} className="space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleMenu(item.name)}
                                                title={sidebarCollapsed ? item.name : undefined}
                                                className={`w-full flex items-center rounded-md text-sm font-medium transition-colors ${sidebarCollapsed ? 'justify-center px-3 py-2' : 'justify-between gap-3 px-3 py-2'} ${isActive
                                                    ? 'bg-primary-50 text-primary-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <span className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                                    {!sidebarCollapsed && item.name}
                                                </span>
                                                {!sidebarCollapsed && (
                                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>
                                            {!sidebarCollapsed && isOpen && (
                                                <div className="ml-4 border-l border-gray-200 pl-4 space-y-1">
                                                    {item.children.map((child) => {
                                                        const childActive = child.href ? location.pathname === child.href || location.pathname.startsWith(child.href + '/') : false;

                                                        if (child.disabled || !child.href) {
                                                            return (
                                                                <span
                                                                    key={child.name}
                                                                    className="flex items-center px-3 py-2 rounded-md text-sm text-gray-400 cursor-default"
                                                                >
                                                                    {child.name}
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <Link
                                                                key={child.name}
                                                                to={child.href}
                                                                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${childActive
                                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                                    }`}
                                                            >
                                                                {child.name}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href || '#'}
                                        title={sidebarCollapsed ? item.name : undefined}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        {!sidebarCollapsed && item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* Top bar */}
                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex flex-1 justify-end gap-x-4 lg:gap-x-6">
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            {user && <NotificationDropdown isAdmin={isAdmin} />}
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                            >
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="" className="h-8 w-8 rounded-full" />
                                    ) : (
                                        <UserIcon className="h-5 w-5 text-primary-600" />
                                    )}
                                </div>
                                <span className="hidden sm:block">
                                    {user?.firstName} {user?.lastName}
                                </span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                <span className="hidden sm:block">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>

            <div
                className={`fixed bottom-4 hidden lg:block z-[60] transition-all duration-300 ${
                    isGuideCompact ? 'left-4 w-12' : 'left-4 w-56'
                }`}
            >
                {proficiencyGuideButton}
            </div>
        </div>
    );
};

export default Layout;
