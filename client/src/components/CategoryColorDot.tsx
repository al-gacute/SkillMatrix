import React from 'react';

interface CategoryColorDotProps {
    color?: string;
    size?: 'sm' | 'md';
    className?: string;
}

const sizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
};

const CategoryColorDot: React.FC<CategoryColorDotProps> = ({ color, size = 'md', className = '' }) => (
    <span
        className={`inline-block rounded-full flex-shrink-0 ${sizeClasses[size]} ${className}`.trim()}
        style={{ backgroundColor: color || '#3B82F6' }}
        aria-hidden="true"
    />
);

export default CategoryColorDot;
