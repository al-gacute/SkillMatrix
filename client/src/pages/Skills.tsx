import React, { useEffect, useState } from 'react';
import { ChevronDownIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import { skillService } from '../services';
import { Skill, SkillCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import CategoryColorDot from '../components/CategoryColorDot';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';

interface CatalogRequestPrefill {
    notificationId: string;
    categoryName?: string;
    skillName?: string;
    existingCategoryId?: string;
    existingCategoryName?: string;
    details?: string;
}

interface SkillsLocationState {
    catalogRequestPrefill?: CatalogRequestPrefill;
}

const Skills: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = (location.state as SkillsLocationState | null) || null;
    const [skills, setSkills] = useState<Skill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<SkillCategory | null>(null);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
    const [lockedCategoryId, setLockedCategoryId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [skillForm, setSkillForm] = useState({ name: '', description: '', category: '' });
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });
    const [handledCatalogRequestId, setHandledCatalogRequestId] = useState<string | null>(null);
    const [pendingRequestedSkillPrefill, setPendingRequestedSkillPrefill] = useState<CatalogRequestPrefill | null>(null);

    const isAdmin = user?.role === 'admin' || Boolean(user?.roleLevel && user.roleLevel >= 3);
    const catalogRequestPrefill = locationState?.catalogRequestPrefill;

    const fetchData = async () => {
        try {
            const [skillsRes, categoriesRes] = await Promise.all([
                skillService.getSkills(),
                skillService.getCategories(),
            ]);
            if (skillsRes.success) setSkills(skillsRes.data || []);
            if (categoriesRes.success) setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (categories.length === 0) {
            setExpandedCategoryId(null);
        } else {
            setExpandedCategoryId((current) =>
                current && categories.some((category) => category._id === current) ? current : null
            );
        }
    }, [categories]);

    const openRequestedSkillModal = (prefill: CatalogRequestPrefill, categoryId?: string) => {
        const resolvedCategoryId =
            categoryId ||
            prefill.existingCategoryId ||
            categories.find((category) => category.name === prefill.existingCategoryName)?._id ||
            '';

        setEditingSkill(null);
        setLockedCategoryId(resolvedCategoryId || null);
        setSkillForm({
            name: prefill.skillName || '',
            description: prefill.details || '',
            category: resolvedCategoryId,
        });

        if (resolvedCategoryId) {
            setExpandedCategoryId(resolvedCategoryId);
        }

        setIsSkillModalOpen(true);
    };

    useEffect(() => {
        if (!catalogRequestPrefill?.notificationId || loading) {
            return;
        }

        if (handledCatalogRequestId === catalogRequestPrefill.notificationId) {
            return;
        }

        const hasCategoryRequest = !!catalogRequestPrefill.categoryName;
        const hasSkillRequest = !!catalogRequestPrefill.skillName;

        if (hasCategoryRequest) {
            setEditingCategory(null);
            setCategoryForm({
                name: catalogRequestPrefill.categoryName || '',
                description: catalogRequestPrefill.details || '',
                color: '#3B82F6',
            });
            setIsCategoryModalOpen(true);

            if (hasSkillRequest) {
                setPendingRequestedSkillPrefill(catalogRequestPrefill);
            }
        } else if (hasSkillRequest) {
            openRequestedSkillModal(catalogRequestPrefill);
        }

        setHandledCatalogRequestId(catalogRequestPrefill.notificationId);
        navigate(location.pathname, { replace: true });
    }, [catalogRequestPrefill, handledCatalogRequestId, loading, navigate, location.pathname, categories]);

    // Skill handlers
    const openSkillModal = (skill?: Skill) => {
        setEditingSkill(skill || null);
        setLockedCategoryId(null);
        const categoryId =
            typeof skill?.category === 'string'
                ? skill.category
                : (skill?.category as SkillCategory | undefined)?._id || '';

        setSkillForm({
            name: skill?.name || '',
            description: skill?.description || '',
            category: categoryId,
        });
        setIsSkillModalOpen(true);
    };

    const openSkillModalForCategory = (categoryId: string) => {
        setEditingSkill(null);
        setLockedCategoryId(categoryId);
        setSkillForm({
            name: '',
            description: '',
            category: categoryId,
        });
        setIsSkillModalOpen(true);
    };

    const handleSkillSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setErrorMessage('');
            if (editingSkill) {
                await skillService.updateSkill(editingSkill._id, skillForm);
                setSuccessMessage(`${skillForm.name} was updated successfully.`);
            } else {
                await skillService.createSkill(skillForm);
                setSuccessMessage(`${skillForm.name} was created successfully.`);
            }
            setIsSkillModalOpen(false);
            setLockedCategoryId(null);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to save skill.');
            console.error('Failed to save skill:', error);
        }
    };

    const handleDeleteSkill = async () => {
        if (!skillToDelete) return;
        try {
            setErrorMessage('');
            const deletedName = skillToDelete.name;
            await skillService.deleteSkill(skillToDelete._id);
            setSkillToDelete(null);
            setSuccessMessage(`${deletedName} was deleted successfully.`);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to delete skill.');
            console.error('Failed to delete skill:', error);
        }
    };

    // Category handlers
    const openCategoryModal = (category?: SkillCategory) => {
        setEditingCategory(category || null);
        setCategoryForm({
            name: category?.name || '',
            description: category?.description || '',
            color: category?.color || '#3B82F6',
        });
        setIsCategoryModalOpen(true);
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setErrorMessage('');
            if (editingCategory) {
                await skillService.updateCategory(editingCategory._id, categoryForm);
                setSuccessMessage(`${categoryForm.name} category was updated successfully.`);
            } else {
                const response = await skillService.createCategory(categoryForm);
                const createdCategory = response.data;
                setSuccessMessage(`${categoryForm.name} category was created successfully.`);
                if (createdCategory?._id) {
                    setExpandedCategoryId(createdCategory._id);
                    if (pendingRequestedSkillPrefill?.skillName) {
                        openRequestedSkillModal(pendingRequestedSkillPrefill, createdCategory._id);
                        setPendingRequestedSkillPrefill(null);
                    }
                }
            }
            setIsCategoryModalOpen(false);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to save category.');
            console.error('Failed to save category:', error);
        }
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        try {
            setErrorMessage('');
            const deletedName = categoryToDelete.name;
            await skillService.deleteCategory(categoryToDelete._id);
            setCategoryToDelete(null);
            setSuccessMessage(`${deletedName} category was deleted successfully.`);
            fetchData();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to delete category.');
            console.error('Failed to delete category:', error);
        }
    };

    const deleteSkillBlocked = !!skillToDelete && (skillToDelete.assignedUserCount || 0) > 0;
    const deleteSkillBlockMessage = skillToDelete
        ? `This skill is still assigned to ${skillToDelete.assignedUserCount || 0} user(s). Remove or reassign them first.`
        : '';
    const deleteCategoryBlocked = !!categoryToDelete && (categoryToDelete.skillCount || 0) > 0;
    const deleteCategoryBlockMessage = categoryToDelete
        ? `This category still has ${categoryToDelete.skillCount || 0} skill(s) assigned to it. Remove those skills first.`
        : '';
    const selectedSkillCategory = categories.find((category) => category._id === skillForm.category);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Skills Library</h1>
                    <p className="text-gray-500 mt-1">Browse and manage available skills</p>
                </div>
            </div>

            {isAdmin && (
                <div className="flex justify-end">
                    <button onClick={() => openCategoryModal()} className="btn-primary">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Category
                    </button>
                </div>
            )}
            <div className="space-y-3">
                {categories.map((category) => {
                    const isExpanded = expandedCategoryId === category._id;
                    const categorySkills = skills.filter(
                        (skill) => (skill.category as SkillCategory)?._id === category._id || skill.category === category._id
                    );

                    return (
                        <div key={category._id} className="card p-0 overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => setExpandedCategoryId(isExpanded ? null : category._id)}
                                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                >
                                    <CategoryColorDot color={category.color} size="md" className="h-4 w-4" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                            <span className="text-sm text-gray-500">
                                                {category.skillCount || 0} skills
                                            </span>
                                        </div>
                                        {category.description && (
                                            <p className="text-sm text-gray-500 mt-1 truncate">
                                                {category.description}
                                            </p>
                                        )}
                                    </div>
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => openCategoryModal(category)}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setCategoryToDelete(category)}
                                                className="p-1 text-gray-400 hover:text-red-600"
                                                title={(category.skillCount || 0) > 0 ? 'This category cannot be deleted until its skills are removed' : 'Delete category'}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setExpandedCategoryId(isExpanded ? null : category._id)}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <ChevronDownIcon
                                            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            {category.description ? (
                                                <p className="text-sm text-gray-600">{category.description}</p>
                                            ) : (
                                                <p className="text-sm text-gray-500">No description for this category.</p>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => openSkillModalForCategory(category._id)}
                                                    className="btn btn-primary"
                                                >
                                                    <PlusIcon className="h-4 w-4 mr-2" />
                                                    Add Skill
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {categorySkills.length > 0 ? (
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Skill
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Description
                                                        </th>
                                                        {isAdmin && (
                                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                Actions
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {categorySkills.map((skill) => (
                                                        <tr key={skill._id} className="align-top">
                                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                                {skill.name}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {skill.description || 'No description'}
                                                            </td>
                                                            {isAdmin && (
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => openSkillModal(skill)}
                                                                            className="p-1 text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <PencilIcon className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setSkillToDelete(skill)}
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
                                    ) : (
                                        <p className="text-sm text-gray-500">No skills in this category yet.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Skill Modal */}
            <Modal
                isOpen={isSkillModalOpen}
                onClose={() => setIsSkillModalOpen(false)}
                title={editingSkill ? 'Edit Skill' : 'Add Skill'}
            >
                <form onSubmit={handleSkillSubmit} className="space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            type="text"
                            value={skillForm.name}
                            onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select
                            value={skillForm.category}
                            onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                            className="input"
                            disabled={!!lockedCategoryId}
                            required
                        >
                            <option value="">Select a category</option>
                            {categories.filter((category) => !category.deletedAt).map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {selectedSkillCategory && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <CategoryColorDot color={selectedSkillCategory.color} />
                                <span>Selected category: {selectedSkillCategory.name}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea
                            value={skillForm.description}
                            onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                            className="input"
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsSkillModalOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingSkill ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Category Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title={editingCategory ? 'Edit Category' : 'Add Category'}
            >
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            type="text"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            className="input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="label">Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={categoryForm.color}
                                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                className="h-10 w-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={categoryForm.color}
                                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                className="input flex-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingCategory ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!skillToDelete}
                onClose={() => setSkillToDelete(null)}
                onConfirm={handleDeleteSkill}
                title="Delete Skill"
                message={deleteSkillBlocked
                    ? deleteSkillBlockMessage
                    : "Are you sure you want to delete this skill?"}
                confirmLabel="Delete"
                confirmDisabled={deleteSkillBlocked}
            />

            <ConfirmDialog
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={handleDeleteCategory}
                title="Delete Category"
                message={deleteCategoryBlocked
                    ? deleteCategoryBlockMessage
                    : 'Are you sure you want to delete this category?'}
                confirmLabel="Delete"
                confirmDisabled={deleteCategoryBlocked}
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

export default Skills;
