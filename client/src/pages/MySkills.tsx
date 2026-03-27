import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, AcademicCapIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon, PlusSmallIcon, MinusSmallIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/react/24/solid';
import { userSkillService, skillService, notificationService } from '../services';
import {
    UserSkill,
    Skill,
    SkillCategory,
    ProficiencyLevel,
    SKILL_EXPERIENCE_TYPES,
    SkillExperienceEntry,
    SkillExperienceType,
    PROFICIENCY_LEVELS,
    PROFICIENCY_LABELS,
} from '../types';
import CategoryColorDot from '../components/CategoryColorDot';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import SuccessDialog from '../components/SuccessDialog';
import ExportIconButton from '../components/ExportIconButton';

const proficiencyOptions: { value: ProficiencyLevel; label: string; description: string }[] = [
    { value: 1, label: '1. Novice / Entry', description: 'Little or no experience; requires constant supervision' },
    { value: 2, label: '2. Advanced Beginner', description: 'Basic understanding; needs support for routine issues' },
    { value: 3, label: '3. Competent', description: 'Handles routine tasks independently' },
    { value: 4, label: '4. Proficient', description: 'Efficient in most situations and understands why tasks work' },
    { value: 5, label: '5. Skilled / Experienced', description: 'High-quality performance with minimal supervision' },
    { value: 6, label: '6. Advanced', description: 'Above-average performance with deeper tool or process knowledge' },
    { value: 7, label: '7. Expert', description: 'Handles complex tasks without supervision' },
    { value: 8, label: '8. Master / Lead', description: 'Leads small teams or complex projects and mentors juniors' },
    { value: 9, label: '9. Authority / Mentor', description: 'SME who defines best practices, trains others, and drives innovation' },
];

const createEmptyExperienceEntry = (): SkillExperienceEntry | { type: ''; startPeriod: string; endPeriod: string } => ({
    type: '',
    startPeriod: '',
    endPeriod: '',
});

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;

const calculateExperienceYears = (entries: Array<Pick<SkillExperienceEntry, 'startPeriod' | 'endPeriod'>>): number | undefined => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const ranges = entries
        .filter((entry) => entry.startPeriod)
        .map((entry) => {
            const start = new Date(`${entry.startPeriod}T00:00:00`);
            const end = entry.endPeriod ? new Date(`${entry.endPeriod}T23:59:59.999`) : new Date(today);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
                return null;
            }

            return { start, end };
        })
        .filter((range): range is { start: Date; end: Date } => range !== null)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (ranges.length === 0) {
        return undefined;
    }

    const mergedRanges = [ranges[0]];

    for (let index = 1; index < ranges.length; index += 1) {
        const currentRange = ranges[index];
        const lastMergedRange = mergedRanges[mergedRanges.length - 1];

        if (currentRange.start.getTime() <= lastMergedRange.end.getTime()) {
            lastMergedRange.end = new Date(Math.max(lastMergedRange.end.getTime(), currentRange.end.getTime()));
            continue;
        }

        mergedRanges.push(currentRange);
    }

    const totalMilliseconds = mergedRanges.reduce(
        (sum, range) => sum + (range.end.getTime() - range.start.getTime()),
        0
    );

    return Math.round((totalMilliseconds / (MILLISECONDS_PER_DAY * DAYS_PER_YEAR)) * 10) / 10;
};

const formatYearsOfExperience = (years: number): string => {
    const formattedYears = Number.isInteger(years) ? years.toString() : years.toFixed(1);
    return `${formattedYears} ${years === 1 ? 'year' : 'years'}`;
};

const getEndorserDisplayName = (endorser: UserSkill['endorsements'][number]) =>
    `${endorser.firstName} ${endorser.lastName}`.trim();

const getEndorsementTotal = (userSkill: UserSkill) =>
    userSkill.endorsementCount || userSkill.endorsements?.length || 0;

const escapeSpreadsheetValue = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const buildWorksheetXml = (sheetName: string, rows: string[][]) => {
    const worksheetRows = rows
        .map((row) => `
            <Row>
                ${row
                    .map(
                        (cell) => `
                    <Cell><Data ss:Type="String">${escapeSpreadsheetValue(cell)}</Data></Cell>`
                    )
                    .join('')}
            </Row>`)
        .join('');

    return `
        <Worksheet ss:Name="${escapeSpreadsheetValue(sheetName)}">
            <Table>
                ${worksheetRows}
            </Table>
        </Worksheet>`;
};

const getSkillCategoryId = (skill: Skill): string =>
    typeof skill.category === 'string' ? skill.category : skill.category?._id || '';

const proficiencyBoxClasses: Record<ProficiencyLevel, string> = {
    1: 'border-gray-200 bg-gray-100',
    2: 'border-gray-300 bg-gray-200',
    3: 'border-green-200 bg-green-100',
    4: 'border-blue-200 bg-blue-100',
    5: 'border-indigo-200 bg-indigo-100',
    6: 'border-purple-200 bg-purple-100',
    7: 'border-orange-200 bg-orange-100',
    8: 'border-red-200 bg-red-100',
    9: 'border-rose-300 bg-rose-200',
};

const proficiencyTextClasses: Record<ProficiencyLevel, string> = {
    1: 'text-gray-700',
    2: 'text-gray-800',
    3: 'text-green-800',
    4: 'text-blue-800',
    5: 'text-indigo-800',
    6: 'text-purple-800',
    7: 'text-orange-800',
    8: 'text-red-800',
    9: 'text-rose-900',
};

type MatrixColumn =
    | {
        key: string;
        categoryId: string;
        kind: 'summary';
    }
    | {
        key: string;
        categoryId: string;
        kind: 'skill';
        userSkill: UserSkill;
    };

const MySkills: React.FC = () => {
    const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
    const [userSkillToDelete, setUserSkillToDelete] = useState<UserSkill | null>(null);
    const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [exporting, setExporting] = useState(false);
    const [requestForm, setRequestForm] = useState({
        categoryName: '',
        existingCategoryId: '',
        skillName: '',
        details: '',
    });
    const [formData, setFormData] = useState({
        category: '',
        skill: '',
        proficiencyLevel: '' as ProficiencyLevel | '',
        experienceEntries: [createEmptyExperienceEntry()],
        notes: '',
        isPublic: true,
    });

    const fetchData = async () => {
        try {
            const [skillsRes, categoriesRes, userSkillsRes] = await Promise.all([
                skillService.getSkills(),
                skillService.getCategories(),
                userSkillService.getMySkills(),
            ]);

            if (skillsRes.success) setAvailableSkills(skillsRes.data || []);
            if (categoriesRes.success) setCategories(categoriesRes.data || []);
            if (userSkillsRes.success) setUserSkills(userSkillsRes.data || []);
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
        setExpandedCategoryIds((current) => current.filter((categoryId) => categories.some((category) => category._id === categoryId)));
    }, [categories]);

    const openAddModal = () => {
        setEditingSkill(null);
        setFormData({
            category: '',
            skill: '',
            proficiencyLevel: '',
            experienceEntries: [createEmptyExperienceEntry()],
            notes: '',
            isPublic: true,
        });
        setIsModalOpen(true);
    };

    const openRequestModal = () => {
        setRequestForm({
            categoryName: '',
            existingCategoryId: '',
            skillName: '',
            details: '',
        });
        setIsRequestModalOpen(true);
    };

    const openEditModal = (userSkill: UserSkill) => {
        setEditingSkill(userSkill);
        const skillCategoryId =
            typeof userSkill.skill.category === 'string'
                ? userSkill.skill.category
                : userSkill.skill.category?._id || '';

        setFormData({
            category: skillCategoryId,
            skill: userSkill.skill._id,
            proficiencyLevel: userSkill.proficiencyLevel,
            experienceEntries: userSkill.experienceEntries?.length
                ? userSkill.experienceEntries.map((entry) => ({
                    type: entry.type,
                    startPeriod: entry.startPeriod ? entry.startPeriod.slice(0, 10) : '',
                    endPeriod: entry.endPeriod ? entry.endPeriod.slice(0, 10) : '',
                }))
                : userSkill.experienceType || userSkill.startPeriod || userSkill.endPeriod
                    ? [{
                        type: userSkill.experienceType || '',
                        startPeriod: userSkill.startPeriod ? userSkill.startPeriod.slice(0, 10) : '',
                        endPeriod: userSkill.endPeriod ? userSkill.endPeriod.slice(0, 10) : '',
                    }]
                    : [createEmptyExperienceEntry()],
            notes: userSkill.notes || '',
            isPublic: userSkill.isPublic,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedExperienceEntries = formData.experienceEntries
            .filter((entry) => entry.type !== '' || entry.startPeriod || entry.endPeriod)
            .map((entry) => ({
                type: entry.type as SkillExperienceType,
                startPeriod: entry.startPeriod || undefined,
                endPeriod: entry.endPeriod || undefined,
            }));

        if (formData.proficiencyLevel === '' || normalizedExperienceEntries.length === 0 || normalizedExperienceEntries.some((entry) => !entry.type)) {
            return;
        }

        try {
            if (editingSkill) {
                await userSkillService.updateSkill(editingSkill._id, {
                    proficiencyLevel: formData.proficiencyLevel,
                    experienceEntries: normalizedExperienceEntries,
                    notes: formData.notes,
                    isPublic: formData.isPublic,
                });
                setSuccessMessage(`${editingSkill.skill.name} was updated successfully.`);
            } else {
                const addedSkillName = availableSkills.find((skill) => skill._id === formData.skill)?.name || 'Skill';
                await userSkillService.addSkill({
                    skill: formData.skill,
                    proficiencyLevel: formData.proficiencyLevel,
                    experienceEntries: normalizedExperienceEntries,
                    notes: formData.notes,
                    isPublic: formData.isPublic,
                });
                setSuccessMessage(`${addedSkillName} was added successfully.`);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save skill:', error);
        }
    };

    const handleDelete = async () => {
        if (!userSkillToDelete) return;
        try {
            const deletedName = userSkillToDelete.skill.name;
            await userSkillService.deleteSkill(userSkillToDelete._id);
            setUserSkillToDelete(null);
            setSuccessMessage(`${deletedName} was removed successfully.`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete skill:', error);
        }
    };

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedCategoryName = requestForm.categoryName.trim();
        const trimmedSkillName = requestForm.skillName.trim();
        const trimmedDetails = requestForm.details.trim();

        if (!trimmedCategoryName && !trimmedSkillName) {
            return;
        }

        const selectedCategory = categories.find((category) => category._id === requestForm.existingCategoryId);

        try {
            setIsRequestSubmitting(true);
            await notificationService.requestCatalogItem({
                categoryName: trimmedCategoryName || undefined,
                skillName: trimmedSkillName || undefined,
                existingCategoryId: requestForm.existingCategoryId || undefined,
                existingCategoryName: selectedCategory?.name,
                details: trimmedDetails || undefined,
            });
            setIsRequestModalOpen(false);
            setSuccessMessage('Your request was sent to the admin team.');
        } catch (error) {
            console.error('Failed to submit catalog request:', error);
        } finally {
            setIsRequestSubmitting(false);
        }
    };

    const userSkillIds = userSkills.map((us) => us.skill._id);
    const skillsToAdd = availableSkills.filter((skill) => !userSkillIds.includes(skill._id));
    const filteredSkillsToAdd = formData.category
        ? skillsToAdd.filter((skill) => {
            const skillCategoryId =
                typeof skill.category === 'string'
                    ? skill.category
                    : (skill.category as SkillCategory)?._id;
            return skillCategoryId === formData.category;
        })
        : [];

    const skillsByCategory = useMemo(
        () =>
            categories
                .map((category) => ({
                    category,
                    skills: userSkills
                        .filter((userSkill) => getSkillCategoryId(userSkill.skill) === category._id)
                        .sort((left, right) => left.skill.name.localeCompare(right.skill.name)),
                }))
                .filter((group) => group.skills.length > 0),
        [categories, userSkills]
    );

    const proficiencyRows = [...PROFICIENCY_LEVELS].sort((left, right) => right - left);

    const displayedColumns = useMemo<MatrixColumn[]>(
        () =>
            skillsByCategory.reduce<MatrixColumn[]>((columns, group) => {
                const isExpanded = expandedCategoryIds.includes(group.category._id);

                if (!isExpanded) {
                    columns.push({
                        key: `category-${group.category._id}`,
                        categoryId: group.category._id,
                        kind: 'summary',
                    });
                    return columns;
                }

                group.skills.forEach((userSkill) => {
                    columns.push({
                        key: `skill-${userSkill.skill._id}`,
                        categoryId: group.category._id,
                        kind: 'skill',
                        userSkill,
                    });
                });

                return columns;
            }, []),
        [expandedCategoryIds, skillsByCategory]
    );

    const toggleCategory = (categoryId: string) => {
        setExpandedCategoryIds((current) =>
            current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId]
        );
    };

    const expandAllCategories = () => {
        setExpandedCategoryIds(skillsByCategory.map((group) => group.category._id));
    };

    const collapseAllCategories = () => {
        setExpandedCategoryIds([]);
    };

    const handleExportSkills = () => {
        try {
            setExporting(true);

            const headers = [
                'Category',
                'Skill',
                'Proficiency Level',
                'Years of Experience',
                'Experience Entries',
                'Visibility',
                'Endorsements',
                'Endorsed By',
                'Notes',
            ];

            const rows = userSkills
                .slice()
                .sort((left, right) => left.skill.name.localeCompare(right.skill.name))
                .map((userSkill) => {
                    const categoryName =
                        typeof userSkill.skill.category === 'string'
                            ? categories.find((category) => category._id === userSkill.skill.category)?.name || userSkill.skill.category
                            : userSkill.skill.category?.name || '';

                    const experienceEntries = userSkill.experienceEntries?.length
                        ? userSkill.experienceEntries
                            .map((entry) => {
                                const range = [entry.startPeriod, entry.endPeriod].filter(Boolean).join(' to ');
                                return [entry.type, range].filter(Boolean).join(': ');
                            })
                            .join(' | ')
                        : '';

                    const endorsedBy = userSkill.endorsements
                        .map((endorser) => `${endorser.firstName} ${endorser.lastName}`)
                        .join(', ');

                    return [
                        categoryName,
                        userSkill.skill.name,
                        `L${userSkill.proficiencyLevel} - ${PROFICIENCY_LABELS[userSkill.proficiencyLevel]}`,
                        userSkill.yearsOfExperience !== undefined ? formatYearsOfExperience(userSkill.yearsOfExperience) : '',
                        experienceEntries,
                        userSkill.isPublic ? 'Public' : 'Private',
                        String(getEndorsementTotal(userSkill)),
                        endorsedBy,
                        userSkill.notes || '',
                    ];
                });

            const workbookXml = `<?xml version="1.0"?>
                <?mso-application progid="Excel.Sheet"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                    xmlns:o="urn:schemas-microsoft-com:office:office"
                    xmlns:x="urn:schemas-microsoft-com:office:excel"
                    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                    ${buildWorksheetXml('My Skills', [headers, ...rows])}
                </Workbook>`;

            const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 10);

            link.href = url;
            link.download = `my-skills-${stamp}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export skills:', error);
        } finally {
            setExporting(false);
        }
    };

    const renderEndorsementBadge = (userSkill: UserSkill) => {
        const endorsementTotal = getEndorsementTotal(userSkill);

        if (!endorsementTotal) {
            return null;
        }

        const endorsers = userSkill.endorsements
            .map(getEndorserDisplayName)
            .filter(Boolean);

        return (
            <div className="group relative">
                <div className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700">
                    <HandThumbUpSolidIcon className="h-3.5 w-3.5" />
                    <span>{endorsementTotal}</span>
                </div>
                <div className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-52 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-600 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                    <p className="font-semibold text-gray-900">
                        Endorsed by
                    </p>
                    <div className="mt-2 space-y-1">
                        {endorsers.length > 0 ? (
                            endorsers.map((name) => (
                                <p key={name} className="leading-tight text-gray-600">
                                    {name}
                                </p>
                            ))
                        ) : (
                            <p className="leading-tight text-gray-500">Endorser details unavailable.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const areAllCategoriesExpanded =
        skillsByCategory.length > 0 && expandedCategoryIds.length === skillsByCategory.length;

    const computedYearsOfExperience = calculateExperienceYears(formData.experienceEntries);
    const selectedRequestCategory = categories.find((category) => category._id === requestForm.existingCategoryId);

    const addExperienceEntry = () => {
        setFormData({
            ...formData,
            experienceEntries: [...formData.experienceEntries, createEmptyExperienceEntry()],
        });
    };

    const updateExperienceEntry = (
        index: number,
        field: 'type' | 'startPeriod' | 'endPeriod',
        value: string
    ) => {
        const nextEntries = [...formData.experienceEntries];
        nextEntries[index] = {
            ...nextEntries[index],
            [field]: value,
        };
        setFormData({ ...formData, experienceEntries: nextEntries });
    };

    const removeExperienceEntry = (index: number) => {
        setFormData({
            ...formData,
            experienceEntries:
                formData.experienceEntries.length > 1
                    ? formData.experienceEntries.filter((_, entryIndex) => entryIndex !== index)
                    : [createEmptyExperienceEntry()],
        });
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="text-xl font-bold text-gray-900">My Skills</h1>
                        <p className="text-sm text-gray-500">Manage your skills and proficiency levels</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ExportIconButton
                        onClick={handleExportSkills}
                        disabled={exporting}
                        title={exporting ? 'Exporting skills...' : 'Export skills'}
                    />
                    <button onClick={openRequestModal} className="btn-secondary">
                        Request Category / Skill
                    </button>
                    <button onClick={openAddModal} className="btn-primary">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Skill
                    </button>
                </div>
            </div>

            {userSkills.length === 0 ? (
                <div className="card text-center py-12">
                    <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No skills yet</h3>
                    <p className="text-gray-500 mt-1">Add your first skill to get started</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <button onClick={openAddModal} className="btn-primary">
                            Add Your First Skill
                        </button>
                        <button onClick={openRequestModal} className="btn-secondary">
                            Request Category / Skill
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col">
                    <div className="h-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-max border-separate border-spacing-0">
                            <thead>
                                <tr className="h-9">
                                    <th
                                        rowSpan={2}
                                        className="sticky left-0 top-0 z-30 min-w-[220px] border-b border-r border-gray-600 bg-gray-800 px-4 py-1.5 text-left align-middle"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                                                Proficiency
                                            </span>
                                            <button
                                                type="button"
                                                onClick={areAllCategoriesExpanded ? collapseAllCategories : expandAllCategories}
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-500 bg-gray-800 text-white transition hover:bg-gray-700"
                                                aria-label={areAllCategoriesExpanded ? 'Collapse all categories' : 'Expand all categories'}
                                                title={areAllCategoriesExpanded ? 'Collapse all categories' : 'Expand all categories'}
                                            >
                                                {areAllCategoriesExpanded ? (
                                                    <MinusSmallIcon className="h-4 w-4" />
                                                ) : (
                                                    <PlusSmallIcon className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </th>
                                    {skillsByCategory.map((group) => {
                                        const isExpanded = expandedCategoryIds.includes(group.category._id);
                                        const columnCount = isExpanded ? group.skills.length : 1;

                                        return (
                                            <th
                                                key={group.category._id}
                                                colSpan={columnCount}
                                                rowSpan={isExpanded ? 1 : 2}
                                                className="sticky top-0 z-20 border-b border-r border-gray-600 bg-gray-800 px-3 py-1.5 text-left"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCategory(group.category._id)}
                                                    className="flex w-full items-start justify-between gap-2 rounded-lg px-1.5 py-0.5 text-left transition hover:bg-gray-700"
                                                >
                                                    <span className="flex min-w-0 items-start gap-2">
                                                        <CategoryColorDot color={group.category.color} className="mt-0.5" />
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-semibold leading-tight text-white">
                                                                {group.category.name}
                                                            </span>
                                                            <span className="block text-[11px] font-medium leading-tight text-gray-300">
                                                                {group.skills.length} skill{group.skills.length === 1 ? '' : 's'}
                                                            </span>
                                                        </span>
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronDownIcon className="h-4 w-4 flex-shrink-0 text-white" />
                                                    ) : (
                                                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white" />
                                                    )}
                                                </button>
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr className="h-10">
                                    {skillsByCategory.map((group) => {
                                        const isExpanded = expandedCategoryIds.includes(group.category._id);

                                        if (!isExpanded) {
                                            return null;
                                        }

                                        return group.skills.map((userSkill) => (
                                            <th
                                                key={userSkill.skill._id}
                                                className="sticky top-9 z-20 min-w-[220px] border-b border-r border-gray-600 bg-gray-800 px-4 py-0.5 text-left text-xs text-gray-300"
                                            >
                                                <div className="space-y-0">
                                                    <p className="text-sm font-medium normal-case leading-tight text-white">
                                                        {userSkill.skill.name}
                                                    </p>
                                                    <p className="text-[10px] normal-case leading-tight text-gray-300">
                                                        {userSkill.yearsOfExperience !== undefined
                                                            ? formatYearsOfExperience(userSkill.yearsOfExperience)
                                                            : 'No duration entered'}
                                                    </p>
                                                </div>
                                            </th>
                                        ));
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {proficiencyRows.map((level) => (
                                    <tr key={level}>
                                        <th className={`sticky left-0 z-20 min-w-[220px] border-b border-r p-0 text-left align-top ${proficiencyBoxClasses[level]}`}>
                                            <div className="flex h-full min-h-[3.75rem] w-full flex-col justify-center px-4 py-2">
                                                <p className={`text-sm font-medium leading-tight ${proficiencyTextClasses[level]}`}>
                                                    {PROFICIENCY_LABELS[level]}
                                                </p>
                                                <p className="mt-1 text-xs leading-tight text-gray-500">Level {level}</p>
                                            </div>
                                        </th>
                                        {displayedColumns.map((column) => (
                                            <td
                                                key={`${level}-${column.key}`}
                                                className="min-w-[220px] border-b border-r border-gray-200 bg-white px-2 py-2 align-top"
                                            >
                                                {column.kind === 'summary' ? (
                                                    <div className="space-y-1.5">
                                                        {skillsByCategory
                                                            .find((group) => group.category._id === column.categoryId)
                                                            ?.skills.filter((userSkill) => userSkill.proficiencyLevel === level)
                                                            .map((userSkill) => (
                                                                <div
                                                                    key={userSkill._id}
                                                                    className="rounded-lg border border-gray-200 bg-gray-100 p-2"
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-medium leading-tight text-black">
                                                                                {userSkill.skill.name}
                                                                            </p>
                                                                            <p className="mt-0.5 text-[11px] leading-tight text-gray-900">
                                                                                {userSkill.yearsOfExperience !== undefined
                                                                                    ? formatYearsOfExperience(userSkill.yearsOfExperience)
                                                                                    : 'No duration entered'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            {renderEndorsementBadge(userSkill)}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openEditModal(userSkill)}
                                                                                className="rounded-md p-1 text-black hover:bg-gray-200 hover:text-black"
                                                                                aria-label={`Edit ${userSkill.skill.name}`}
                                                                            >
                                                                                <PencilIcon className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setUserSkillToDelete(userSkill)}
                                                                                className="rounded-md p-1 text-black hover:bg-gray-200 hover:text-red-700"
                                                                                aria-label={`Remove ${userSkill.skill.name}`}
                                                                            >
                                                                                <TrashIcon className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                ) : column.userSkill.proficiencyLevel === level ? (
                                                    <div className="rounded-lg border border-gray-200 bg-gray-100 p-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium leading-tight text-black">
                                                                    {column.userSkill.skill.name}
                                                                </p>
                                                                <p className="mt-0.5 text-[11px] leading-tight text-gray-900">
                                                                    {column.userSkill.yearsOfExperience !== undefined
                                                                        ? formatYearsOfExperience(column.userSkill.yearsOfExperience)
                                                                        : 'No duration entered'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {renderEndorsementBadge(column.userSkill)}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditModal(column.userSkill)}
                                                                    className="rounded-md p-1 text-black hover:bg-gray-200 hover:text-black"
                                                                    aria-label={`Edit ${column.userSkill.skill.name}`}
                                                                >
                                                                    <PencilIcon className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setUserSkillToDelete(column.userSkill)}
                                                                    className="rounded-md p-1 text-black hover:bg-gray-200 hover:text-red-700"
                                                                    aria-label={`Remove ${column.userSkill.skill.name}`}
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/60" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSkill ? 'Edit Skill' : 'Add Skill'}
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingSkill && (
                        <>
                            <div>
                                <label className="label">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value, skill: '' })}
                                    className="input"
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Skill</label>
                                <select
                                    value={formData.skill}
                                    onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                                    className="input"
                                    disabled={!formData.category}
                                    required
                                >
                                    <option value="">{formData.category ? 'Select a skill' : 'Select a category first'}</option>
                                    {filteredSkillsToAdd.map((skill) => (
                                        <option key={skill._id} value={skill._id}>
                                            {skill.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="label">Proficiency Level</label>
                        <select
                            value={formData.proficiencyLevel}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    proficiencyLevel: e.target.value ? (parseInt(e.target.value) as ProficiencyLevel) : '',
                                })
                            }
                            className="input"
                            required
                        >
                            <option value="">Select a proficiency level</option>
                            {proficiencyOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="label">Experience Entries</label>
                            <button type="button" onClick={addExperienceEntry} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                                + Add Entry
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 bg-white">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Type
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Start
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            End
                                        </th>
                                        <th className="w-12 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {formData.experienceEntries.map((entry, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 align-top">
                                                <select
                                                    value={entry.type}
                                                    onChange={(e) => updateExperienceEntry(index, 'type', e.target.value)}
                                                    className="input min-w-[240px]"
                                                    required
                                                >
                                                    <option value="">Select a type</option>
                                                    {SKILL_EXPERIENCE_TYPES.map((type) => (
                                                        <option key={type} value={type}>
                                                            {type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="date"
                                                    value={entry.startPeriod || ''}
                                                    onChange={(e) => updateExperienceEntry(index, 'startPeriod', e.target.value)}
                                                    className="input min-w-[150px]"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="date"
                                                    value={entry.endPeriod || ''}
                                                    onChange={(e) => updateExperienceEntry(index, 'endPeriod', e.target.value)}
                                                    className="input min-w-[150px]"
                                                    min={entry.startPeriod || undefined}
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeExperienceEntry(index)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Remove experience entry ${index + 1}`}
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">Auto-calculated experience:</span>{' '}
                        <span>
                            {computedYearsOfExperience !== undefined
                                ? formatYearsOfExperience(computedYearsOfExperience)
                                : 'Add a start date to at least one entry to calculate total experience.'}
                        </span>
                    </div>

                    <div>
                        <label className="label">Notes (optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input"
                            rows={3}
                            placeholder="Add any additional notes about your experience..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={formData.isPublic}
                            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-700">
                            Make this skill visible to others
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingSkill ? 'Save Changes' : 'Add Skill'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Request Category or Skill"
                size="lg"
            >
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Send a request to the admin team if you need a new category, a new skill, or both.
                    </p>

                    <div>
                        <label className="label">New Category Name (optional)</label>
                        <input
                            type="text"
                            value={requestForm.categoryName}
                            onChange={(e) => setRequestForm({ ...requestForm, categoryName: e.target.value })}
                            className="input"
                            placeholder="Example: Cloud Platforms"
                        />
                    </div>

                    <div>
                        <label className="label">Existing Category for Requested Skill (optional)</label>
                        <select
                            value={requestForm.existingCategoryId}
                            onChange={(e) => setRequestForm({ ...requestForm, existingCategoryId: e.target.value })}
                            className="input"
                        >
                            <option value="">Select an existing category</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Leave this blank if the requested skill belongs in the new category above.
                        </p>
                    </div>

                    <div>
                        <label className="label">New Skill Name (optional)</label>
                        <input
                            type="text"
                            value={requestForm.skillName}
                            onChange={(e) => setRequestForm({ ...requestForm, skillName: e.target.value })}
                            className="input"
                            placeholder="Example: Terraform"
                        />
                        {selectedRequestCategory && requestForm.skillName.trim() && (
                            <p className="mt-1 text-xs text-gray-500">
                                This skill request will be sent under {selectedRequestCategory.name}.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="label">Why is this needed? (optional)</label>
                        <textarea
                            value={requestForm.details}
                            onChange={(e) => setRequestForm({ ...requestForm, details: e.target.value })}
                            className="input"
                            rows={4}
                            placeholder="Share the business need, team use case, or context for the request."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsRequestModalOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isRequestSubmitting || (!requestForm.categoryName.trim() && !requestForm.skillName.trim())}
                        >
                            {isRequestSubmitting ? 'Sending...' : 'Send Request'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!userSkillToDelete}
                onClose={() => setUserSkillToDelete(null)}
                onConfirm={handleDelete}
                title="Remove Skill"
                message="Are you sure you want to remove this skill?"
                confirmLabel="Remove"
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

export default MySkills;
