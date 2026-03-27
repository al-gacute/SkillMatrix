import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    MinusSmallIcon,
    PlusSmallIcon,
} from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { userService, userSkillService } from '../services';
import {
    PROFICIENCY_LABELS,
    PROFICIENCY_LEVELS,
    ProficiencyLevel,
    ROLE_LABELS,
    Skill,
    SkillCategory,
    Team,
    User,
    UserSkill,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import CategoryColorDot from '../components/CategoryColorDot';
import ConfirmDialog from '../components/ConfirmDialog';

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

const getSkillCategoryId = (skill: Skill): string =>
    typeof skill.category === 'string' ? skill.category : skill.category?._id || '';

const formatYearsOfExperience = (years: number): string => {
    const formattedYears = Number.isInteger(years) ? years.toString() : years.toFixed(1);
    return `${formattedYears} ${years === 1 ? 'year' : 'years'}`;
};

const formatExperiencePeriod = (period?: string) => {
    if (!period) {
        return '';
    }

    const date = new Date(period);

    if (Number.isNaN(date.getTime())) {
        return period;
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getExperienceEntries = (userSkill: UserSkill) =>
    userSkill.experienceEntries?.length
        ? userSkill.experienceEntries
        : userSkill.experienceType || userSkill.startPeriod || userSkill.endPeriod
          ? [
                {
                    type: userSkill.experienceType,
                    startPeriod: userSkill.startPeriod,
                    endPeriod: userSkill.endPeriod,
                },
            ]
          : [];

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

const BrowseMatrixDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();
    const [member, setMember] = useState<User | null>(null);
    const [skills, setSkills] = useState<UserSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [endorsingSkillId, setEndorsingSkillId] = useState('');
    const [skillPendingEndorsement, setSkillPendingEndorsement] = useState<UserSkill | null>(null);
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

    const fetchMemberMatrix = async () => {
        if (!id) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await userService.getUser(id, { context: 'browse_matrix' });

            if (response.success && response.data) {
                setMember(response.data.user);
                setSkills(response.data.skills || []);
            } else {
                setError(response.message || 'Failed to load the member matrix.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load the member matrix.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMemberMatrix();
    }, [id]);

    const skillsByCategory = useMemo(
        () =>
            Object.values(
                skills.reduce((acc, userSkill) => {
                    const category = userSkill.skill.category as SkillCategory;
                    const categoryId = getSkillCategoryId(userSkill.skill) || 'uncategorized';

                    if (!acc[categoryId]) {
                        acc[categoryId] = {
                            category,
                            skills: [],
                        };
                    }

                    acc[categoryId].skills.push(userSkill);
                    return acc;
                }, {} as Record<string, { category: SkillCategory; skills: UserSkill[] }>)
            )
                .map((group) => ({
                    category: group.category,
                    skills: [...group.skills].sort((left, right) => left.skill.name.localeCompare(right.skill.name)),
                }))
                .sort((left, right) => (left.category?.name || '').localeCompare(right.category?.name || '')),
        [skills]
    );

    useEffect(() => {
        setExpandedCategoryIds((current) =>
            current.filter((categoryId) => skillsByCategory.some((group) => group.category?._id === categoryId))
        );
    }, [skillsByCategory]);

    const displayedColumns = useMemo<MatrixColumn[]>(
        () =>
            skillsByCategory.reduce<MatrixColumn[]>((columns, group) => {
                const categoryId = group.category?._id || 'uncategorized';
                const isExpanded = expandedCategoryIds.includes(categoryId);

                if (!isExpanded) {
                    columns.push({
                        key: `category-${categoryId}`,
                        categoryId,
                        kind: 'summary',
                    });
                    return columns;
                }

                group.skills.forEach((userSkill) => {
                    columns.push({
                        key: `skill-${userSkill.skill._id}`,
                        categoryId,
                        kind: 'skill',
                        userSkill,
                    });
                });

                return columns;
            }, []),
        [expandedCategoryIds, skillsByCategory]
    );

    const currentUserId = currentUser ? getUserId(currentUser) : '';
    const isOwnProfile = member ? getUserId(member) === currentUserId : false;
    const proficiencyRows = [...PROFICIENCY_LEVELS].sort((left, right) => right - left);
    const areAllCategoriesExpanded =
        skillsByCategory.length > 0 &&
        expandedCategoryIds.length === skillsByCategory.length;

    const toggleCategory = (categoryId: string) => {
        setExpandedCategoryIds((current) =>
            current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId]
        );
    };

    const expandAllCategories = () => {
        setExpandedCategoryIds(
            skillsByCategory
                .map((group) => group.category?._id)
                .filter((categoryId): categoryId is string => Boolean(categoryId))
        );
    };

    const collapseAllCategories = () => {
        setExpandedCategoryIds([]);
    };

    const renderEndorseAction = (userSkill: UserSkill) => {
        const alreadyEndorsed = userSkill.endorsements.some(
            (endorser) => getUserId(endorser) === currentUserId
        );

        if (isOwnProfile) {
            return <span className="text-xs text-gray-400">Your skill</span>;
        }

        return (
            <button
                type="button"
                onClick={() => setSkillPendingEndorsement(userSkill)}
                disabled={alreadyEndorsed || endorsingSkillId === userSkill._id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                    alreadyEndorsed
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                }`}
            >
                <HandThumbUpSolidIcon className="h-3.5 w-3.5" />
                <span>
                    {endorsingSkillId === userSkill._id ? 'Endorsing...' : alreadyEndorsed ? 'Endorsed' : 'Endorse'}
                </span>
            </button>
        );
    };

    const renderSkillTile = (userSkill: UserSkill) => {
        const experienceEntries = getExperienceEntries(userSkill);

        return (
            <div className="group relative rounded-lg border border-gray-200 bg-gray-100 p-2">
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
                        {renderEndorseAction(userSkill)}
                    </div>
                </div>

                {experienceEntries.length > 0 && (
                    <div className="pointer-events-none invisible absolute left-2 right-2 top-full z-30 mt-2 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-600 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                        <p className="font-semibold text-gray-900">Experience Entries</p>
                        <div className="mt-2 space-y-2">
                            {experienceEntries.map((entry, index) => {
                                const startLabel = formatExperiencePeriod(entry.startPeriod);
                                const endLabel = entry.endPeriod ? formatExperiencePeriod(entry.endPeriod) : 'Present';
                                const hasPeriod = startLabel || entry.endPeriod;

                                return (
                                    <div key={`${entry.type || 'entry'}-${index}`} className="leading-tight text-gray-600">
                                        <p className="font-medium text-gray-800">{entry.type || 'Experience entry'}</p>
                                        {hasPeriod && (
                                            <p className="mt-0.5">
                                                {startLabel || 'Start'} - {endLabel}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleEndorseSkill = async () => {
        if (!member || !currentUser || isOwnProfile || !skillPendingEndorsement) {
            return;
        }

        try {
            setEndorsingSkillId(skillPendingEndorsement._id);
            setNotice(null);
            const response = await userSkillService.endorseSkill(skillPendingEndorsement._id);

            if (response.success) {
                setNotice({ type: 'success', text: `Endorsement added for ${member.firstName} ${member.lastName}.` });
                setSkillPendingEndorsement(null);
                await fetchMemberMatrix();
            } else {
                setNotice({ type: 'error', text: response.message || 'Failed to endorse this skill.' });
            }
        } catch (err: any) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to endorse this skill.' });
        } finally {
            setEndorsingSkillId('');
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!member) {
        return (
            <div className="space-y-4">
                <Link to="/browse-matrix" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeftIcon className="mr-1 h-4 w-4" />
                    Back to Browse Matrix
                </Link>
                <div className="card py-12 text-center text-gray-500">{error || 'Member not found.'}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link to="/browse-matrix" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back to Browse Matrix
            </Link>

            <div className="card">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-3xl font-bold text-primary-600">
                        {getInitials(member)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {member.firstName} {member.lastName}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">{member.email}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                                {ROLE_LABELS[member.role] || member.role}
                            </span>
                            {getEntityName(member.department) && (
                                <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                    {getEntityName(member.department)}
                                </span>
                            )}
                            {getSectionName(member.team) && (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                    {getSectionName(member.team)}
                                </span>
                            )}
                            {getEntityName(member.team) && (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                    {getEntityName(member.team)}
                                </span>
                            )}
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            Only public skills are shown here. Use the action button on each skill tile to endorse what
                            you&apos;ve seen this member demonstrate.
                        </p>
                    </div>
                </div>
            </div>

            {notice && (
                <div
                    className={`rounded-lg px-4 py-3 text-sm ${
                        notice.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                >
                    {notice.text}
                </div>
            )}

            {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Skills Matrix ({skills.length})</h2>

                {skills.length === 0 ? (
                    <div className="card py-12 text-center">
                        <p className="text-gray-500">No public skills are available for this member yet.</p>
                    </div>
                ) : (
                    <div className="overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                                        const categoryId = group.category?._id || 'uncategorized';
                                        const isExpanded = expandedCategoryIds.includes(categoryId);
                                        const columnCount = isExpanded ? group.skills.length : 1;

                                        return (
                                            <th
                                                key={categoryId}
                                                colSpan={columnCount}
                                                rowSpan={isExpanded ? 1 : 2}
                                                className="sticky top-0 z-20 border-b border-r border-gray-600 bg-gray-800 px-3 py-1.5 text-left"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCategory(categoryId)}
                                                    className="flex w-full items-start justify-between gap-2 rounded-lg px-1.5 py-0.5 text-left transition hover:bg-gray-700"
                                                >
                                                    <span className="flex min-w-0 items-start gap-2">
                                                        <CategoryColorDot color={group.category?.color} className="mt-0.5" />
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-semibold leading-tight text-white">
                                                                {group.category?.name || 'Uncategorized'}
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
                                        const categoryId = group.category?._id || 'uncategorized';
                                        const isExpanded = expandedCategoryIds.includes(categoryId);

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
                                        <th
                                            className={`sticky left-0 z-20 min-w-[220px] border-b border-r p-0 text-left align-top ${proficiencyBoxClasses[level]}`}
                                        >
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
                                                            .find(
                                                                (group) =>
                                                                    (group.category?._id || 'uncategorized') === column.categoryId
                                                            )
                                                            ?.skills.filter((userSkill) => userSkill.proficiencyLevel === level)
                                                            .map((userSkill) => (
                                                                <div key={userSkill._id}>{renderSkillTile(userSkill)}</div>
                                                            ))}
                                                    </div>
                                                ) : column.userSkill.proficiencyLevel === level ? (
                                                    renderSkillTile(column.userSkill)
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
                )}
            </div>

            <ConfirmDialog
                isOpen={!!skillPendingEndorsement}
                title="Confirm Endorsement"
                message={
                    skillPendingEndorsement
                        ? `Do you want to endorse ${skillPendingEndorsement.skill.name} for ${member.firstName} ${member.lastName}?`
                        : 'Do you want to endorse this skill?'
                }
                confirmLabel={endorsingSkillId ? 'Endorsing...' : 'Endorse'}
                confirmVariant="primary"
                isLoading={!!endorsingSkillId}
                onConfirm={handleEndorseSkill}
                onClose={() => {
                    if (!endorsingSkillId) {
                        setSkillPendingEndorsement(null);
                    }
                }}
            />
        </div>
    );
};

export default BrowseMatrixDetail;
