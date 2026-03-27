import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportIconButtonProps {
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}

const ExportIconButton: React.FC<ExportIconButtonProps> = ({
    onClick,
    disabled = false,
    title = 'Export',
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
    );
};

export default ExportIconButton;
