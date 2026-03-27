import React from 'react';
import { SkillCategory, UserSkill, ProficiencyLevel, PROFICIENCY_LEVELS, formatProficiencyLevel } from '../types';
import CategoryColorDot from './CategoryColorDot';

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

type SkillRatingInput = {
    skill: string;
    rating: number;
    comments?: string;
};

interface AssessmentMatrixSnapshotProps {
    skills: UserSkill[];
    skillRatings?: SkillRatingInput[];
    onSkillRatingChange?: (skillId: string, updates: Partial<Pick<SkillRatingInput, 'rating' | 'comments'>>) => void;
}

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

const AssessmentMatrixSnapshot: React.FC<AssessmentMatrixSnapshotProps> = ({ skills, skillRatings = [], onSkillRatingChange }) => {
    const skillsByCategory = skills.reduce((acc, userSkill) => {
        const category = userSkill.skill.category as SkillCategory;
        const categoryId = category?._id || 'uncategorized';

        if (!acc[categoryId]) {
            acc[categoryId] = { category, skills: [] };
        }

        acc[categoryId].skills.push(userSkill);
        return acc;
    }, {} as Record<string, { category: SkillCategory; skills: UserSkill[] }>);

    return (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="min-w-[150px] bg-gray-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Category
                            </th>
                            <th className="min-w-[140px] bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Skill
                            </th>
                            <th className="min-w-[130px] bg-gray-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Proficiency
                            </th>
                            <th className="min-w-[80px] bg-gray-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Years
                            </th>
                            <th className="min-w-[120px] bg-gray-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Endorsements
                            </th>
                            <th className="min-w-[220px] bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Experience Entries
                            </th>
                            {onSkillRatingChange && (
                                <>
                                    <th className="min-w-[170px] bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Assessor Rating
                                    </th>
                                    <th className="min-w-[220px] bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Optional Comments
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {Object.values(skillsByCategory).map((group) => (
                            group.skills.map((userSkill, skillIndex) => {
                                const skillRating = skillRatings.find((entry) => entry.skill === userSkill.skill._id);
                                const experienceEntries = getExperienceEntries(userSkill);

                                return (
                                    <tr key={userSkill._id} className="hover:bg-gray-50">
                                        {skillIndex === 0 && (
                                            <td
                                                rowSpan={group.skills.length}
                                                className="border-r border-gray-200 bg-gray-50 px-4 py-3 align-top"
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
                                                className={`inline-flex items-center justify-center min-w-[80px] rounded px-2 py-1 text-xs font-semibold ${proficiencyColors[userSkill.proficiencyLevel]}`}
                                                title={formatProficiencyLevel(userSkill.proficiencyLevel)}
                                            >
                                                <span>{formatProficiencyLevel(userSkill.proficiencyLevel)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm text-gray-600">
                                                {userSkill.yearsOfExperience ? `${userSkill.yearsOfExperience}y` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm text-gray-600">{userSkill.endorsementCount || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {experienceEntries.length > 0 ? (
                                                <div className="space-y-1">
                                                    {experienceEntries.map((entry, index) => {
                                                        const startLabel = formatExperiencePeriod(entry.startPeriod);
                                                        const endLabel = entry.endPeriod ? formatExperiencePeriod(entry.endPeriod) : 'Present';
                                                        const hasPeriod = startLabel || entry.endPeriod;

                                                        return (
                                                            <div key={`${entry.type || 'entry'}-${index}`} className="text-xs leading-tight text-gray-600">
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
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        {onSkillRatingChange && (
                                            <>
                                                <td className="px-4 py-3 align-top">
                                                    <select
                                                        value={skillRating?.rating ?? userSkill.proficiencyLevel}
                                                        onChange={(e) => onSkillRatingChange(userSkill.skill._id, { rating: Number(e.target.value) })}
                                                        className="input min-w-[160px]"
                                                    >
                                                        {PROFICIENCY_LEVELS.map((rating) => (
                                                            <option key={rating} value={rating}>
                                                                {formatProficiencyLevel(rating)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <textarea
                                                        value={skillRating?.comments || ''}
                                                        onChange={(e) => onSkillRatingChange(userSkill.skill._id, { comments: e.target.value })}
                                                        placeholder="Optional comments..."
                                                        className="input min-w-[220px]"
                                                        rows={2}
                                                    />
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssessmentMatrixSnapshot;
