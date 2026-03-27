import React, { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import { ROLE_LABELS, Team } from '../types';
import SuccessDialog from '../components/SuccessDialog';

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

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [successMessage, setSuccessMessage] = useState('');

    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate('/dashboard');
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await authService.updateProfile(profileData);
            if (response.success && response.data) {
                updateUser(response.data);
                setSuccessMessage('Profile updated successfully.');
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);

        try {
            await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
            setSuccessMessage('Password changed successfully.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch {
            setMessage({ type: 'error', text: 'Failed to change password. Check your current password.' });
        } finally {
            setLoading(false);
        }
    };

    const departmentName = getEntityName(user?.department);
    const sectionName = getSectionName(user?.team);
    const teamName = getEntityName(user?.team);
    const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : '';

    return (
        <div className="mx-auto max-w-3xl">
            <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back
            </button>

            <div className="mt-4">
                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="mt-1 text-gray-500">Manage your account settings</p>
            </div>

            <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === 'profile'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === 'password'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                        Password
                    </button>
                </nav>
            </div>

            {message.type === 'error' && message.text && (
                <div className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {message.text}
                </div>
            )}

            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
                    <div className="card">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="label">First Name</label>
                                <input
                                    type="text"
                                    value={profileData.firstName}
                                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Last Name</label>
                                <input
                                    type="text"
                                    value={profileData.lastName}
                                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="label">Email</label>
                            <input type="email" value={user?.email || ''} className="input bg-gray-50" disabled />
                            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                        </div>

                        <div className="mt-4">
                            <label className="label">Job Title</label>
                            <input
                                type="text"
                                value={user?.title || ''}
                                className="input bg-gray-50"
                                disabled
                            />
                            <p className="mt-1 text-xs text-gray-500">Job title is managed by the admin setup.</p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="label">Role</label>
                                <input type="text" value={roleLabel} className="input bg-gray-50" disabled />
                            </div>
                            <div>
                                <label className="label">Department</label>
                                <input type="text" value={departmentName} className="input bg-gray-50" disabled />
                            </div>
                            <div>
                                <label className="label">Section</label>
                                <input type="text" value={sectionName} className="input bg-gray-50" disabled />
                            </div>
                            <div>
                                <label className="label">Team</label>
                                <input type="text" value={teamName} className="input bg-gray-50" disabled />
                            </div>
                        </div>

                        <div className="mt-6">
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-6">
                    <div className="card">
                        <div>
                            <label className="label">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div className="mt-4">
                            <label className="label">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="input"
                                required
                                placeholder="At least 6 characters"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="label">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div className="mt-6">
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <SuccessDialog
                isOpen={!!successMessage}
                onClose={() => setSuccessMessage('')}
                title="Action Completed"
                message={successMessage}
            />
        </div>
    );
};

export default Profile;
