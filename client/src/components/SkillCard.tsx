import React from 'react';
import { UserSkill, SkillCategory, User } from '../types';
import ProficiencyBadge from './ProficiencyBadge';
import CategoryColorDot from './CategoryColorDot';
import { HandThumbUpIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/react/24/solid';

interface SkillCardProps {
    userSkill: UserSkill;
    currentUserId?: string;
    onEndorse?: () => void;
    onRemoveEndorsement?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

const formatYearsOfExperience = (years: number): string => {
    const formattedYears = Number.isInteger(years) ? years.toString() : years.toFixed(1);
    return `${formattedYears} ${years === 1 ? 'year' : 'years'}`;
};

const SkillCard: React.FC<SkillCardProps> = ({
    userSkill,
    currentUserId,
    onEndorse,
    onRemoveEndorsement,
    onEdit,
    onDelete,
    showActions = true,
}) => {
    const skill = userSkill.skill;
    const category = skill.category as SkillCategory;
    const isEndorsedByCurrentUser = currentUserId && userSkill.endorsements.some(
        (e) => (typeof e === 'string' ? e : e._id || (e as User).id) === currentUserId
    );
    const isOwnSkill = typeof userSkill.user === 'string'
        ? userSkill.user === currentUserId
        : (userSkill.user._id || userSkill.user.id) === currentUserId;
    const experienceEntries = userSkill.experienceEntries?.length
        ? userSkill.experienceEntries
        : userSkill.experienceType || userSkill.startPeriod || userSkill.endPeriod
            ? [{
                type: userSkill.experienceType,
                startPeriod: userSkill.startPeriod,
                endPeriod: userSkill.endPeriod,
            }]
            : [];

    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <CategoryColorDot color={category?.color} />
                        <span className="text-xs text-gray-500">{category?.name || 'Uncategorized'}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h3>
                    <div className="flex items-center gap-3 mb-2">
                        <ProficiencyBadge level={userSkill.proficiencyLevel} size="sm" />
                        {userSkill.yearsOfExperience !== undefined && (
                            <span className="text-sm text-gray-500">
                                {formatYearsOfExperience(userSkill.yearsOfExperience)}
                            </span>
                        )}
                    </div>
                    {experienceEntries.length > 0 && (
                        <div className="space-y-1 text-sm text-gray-500">
                            {experienceEntries.map((entry, index) => {
                                const periodLabel = entry.startPeriod || entry.endPeriod
                                    ? `${entry.startPeriod ? new Date(entry.startPeriod).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start'} - ${entry.endPeriod ? new Date(entry.endPeriod).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Present'}`
                                    : null;

                                return (
                                    <p key={`${entry.type || 'entry'}-${index}`}>
                                        {entry.type}
                                        {periodLabel ? ` - ${periodLabel}` : ''}
                                    </p>
                                );
                            })}
                        </div>
                    )}
                    {userSkill.notes && (
                        <p className="text-sm text-gray-600 mt-2">{userSkill.notes}</p>
                    )}
                </div>

                {showActions && (
                    <div className="flex items-center gap-2">
                        {!isOwnSkill && onEndorse && onRemoveEndorsement && (
                            <button
                                onClick={isEndorsedByCurrentUser ? onRemoveEndorsement : onEndorse}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isEndorsedByCurrentUser
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {isEndorsedByCurrentUser ? (
                                    <HandThumbUpSolidIcon className="h-4 w-4" />
                                ) : (
                                    <HandThumbUpIcon className="h-4 w-4" />
                                )}
                                <span>{userSkill.endorsementCount}</span>
                            </button>
                        )}
                        {isOwnSkill && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <HandThumbUpSolidIcon className="h-4 w-4 text-primary-500" />
                                <span>{userSkill.endorsementCount}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isOwnSkill && showActions && (onEdit || onDelete) && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    {onEdit && (
                        <button onClick={onEdit} className="text-sm text-primary-600 hover:text-primary-700">
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="text-sm text-red-600 hover:text-red-700">
                            Remove
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SkillCard;
