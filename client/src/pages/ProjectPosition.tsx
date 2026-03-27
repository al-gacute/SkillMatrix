import React, { useEffect, useState } from 'react';
import { BriefcaseIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import SuccessDialog from '../components/SuccessDialog';
import { useAuth } from '../context/AuthContext';
import { projectPositionService } from '../services';
import { ProjectPosition as ProjectPositionType } from '../types';

type FormState = {
    name: string;
    description: string;
};

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const emptyForm: FormState = {
    name: '',
    description: '',
};

const ProjectPosition: React.FC = () => {
    const { user } = useAuth();
    const [projectPositions, setProjectPositions] = useState<ProjectPositionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProjectPosition, setEditingProjectPosition] = useState<ProjectPositionType | null>(null);
    const [projectPositionToDelete, setProjectPositionToDelete] = useState<ProjectPositionType | null>(null);
    const [formData, setFormData] = useState<FormState>(emptyForm);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const isAdmin = user?.role === 'admin';

    const getErrorMessage = (error: unknown, fallback: string) =>
        (error as ApiError)?.response?.data?.message || fallback;

    const fetchProjectPositions = async () => {
        try {
            const response = await projectPositionService.getProjectPositions();
            if (response.success) {
                setProjectPositions(response.data || []);
            }
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to load company positions.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectPositions();
    }, []);

    const openModal = (projectPosition?: ProjectPositionType) => {
        setEditingProjectPosition(projectPosition || null);
        setFormData({
            name: projectPosition?.name || '',
            description: projectPosition?.description || '',
        });
        setErrorMessage('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProjectPosition(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
            };

            if (editingProjectPosition) {
                await projectPositionService.updateProjectPosition(editingProjectPosition._id, payload);
                setSuccessMessage(`${payload.name} was updated successfully.`);
            } else {
                await projectPositionService.createProjectPosition(payload);
                setSuccessMessage(`${payload.name} was created successfully.`);
            }

            closeModal();
            fetchProjectPositions();
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to save company positions.'));
        }
    };

    const handleDelete = async () => {
        if (!projectPositionToDelete) return;

        try {
            const deletedName = projectPositionToDelete.name;
            await projectPositionService.deleteProjectPosition(projectPositionToDelete._id);
            setProjectPositionToDelete(null);
            setSuccessMessage(`${deletedName} was deleted successfully.`);
            fetchProjectPositions();
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to delete company positions.'));
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Company Positions</h1>
                    <p className="mt-1 text-gray-500">Manage company positions available for your organization.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => openModal()} className="btn-primary">
                        <PlusIcon className="mr-2 h-5 w-5" />
                        Add Company Position
                    </button>
                )}
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            {projectPositions.length === 0 ? (
                <div className="card py-12 text-center">
                    <BriefcaseIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">No Company Positions yet</h3>
                    <p className="mt-1 text-gray-500">Create the first company position to start organizing assignments.</p>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Description
                                    </th>
                                    {isAdmin && (
                                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {projectPositions.map((projectPosition) => (
                                    <tr key={projectPosition._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="rounded-lg bg-blue-100 p-3">
                                                    <BriefcaseIcon className="h-6 w-6 text-blue-900" />
                                                </div>
                                                <span className="font-semibold text-gray-900">{projectPosition.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {projectPosition.description || 'No description'}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openModal(projectPosition)}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                        aria-label={`Edit ${projectPosition.name}`}
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setProjectPositionToDelete(projectPosition)}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                        aria-label={`Delete ${projectPosition.name}`}
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

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingProjectPosition ? 'Edit Company Position' : 'Add Company Position'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            maxLength={100}
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
                            maxLength={300}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={closeModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingProjectPosition ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!projectPositionToDelete}
                onClose={() => setProjectPositionToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Company Position"
                message={
                    projectPositionToDelete
                        ? `Are you sure you want to delete ${projectPositionToDelete.name}?`
                        : 'Are you sure you want to delete this company position entry?'
                }
                confirmLabel="Delete"
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

export default ProjectPosition;
