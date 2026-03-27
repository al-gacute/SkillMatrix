import React from 'react';
import { ProficiencyLevel, formatProficiencyLevel } from '../types';

interface ProficiencyBadgeProps {
    level: ProficiencyLevel;
    size?: 'sm' | 'md';
    showLevel?: boolean;
}

const levelConfig: Record<ProficiencyLevel, { className: string }> = {
    1: { className: 'bg-gray-100 text-gray-700' },
    2: { className: 'bg-gray-200 text-gray-800' },
    3: { className: 'bg-green-100 text-green-800' },
    4: { className: 'bg-blue-100 text-blue-800' },
    5: { className: 'bg-indigo-100 text-indigo-800' },
    6: { className: 'bg-purple-100 text-purple-800' },
    7: { className: 'bg-orange-100 text-orange-800' },
    8: { className: 'bg-red-100 text-red-800' },
    9: { className: 'bg-rose-200 text-rose-900' },
};

const ProficiencyBadge: React.FC<ProficiencyBadgeProps> = ({ level, size = 'md', showLevel = true }) => {
    const config = levelConfig[level] || levelConfig[1];
    const label = formatProficiencyLevel(level);
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm';

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses}`}>
            {showLevel ? label : label.replace(/^L\d+\s-\s/, '')}
        </span>
    );
};

export default ProficiencyBadge;
