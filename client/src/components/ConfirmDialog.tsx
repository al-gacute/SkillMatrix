import React from 'react';
import { ExclamationTriangleIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
    onClose: () => void;
    isLoading?: boolean;
    confirmDisabled?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title = 'Confirm Action',
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    confirmVariant = 'danger',
    onConfirm,
    onClose,
    isLoading = false,
    confirmDisabled = false,
}) => {
    const confirmClassName = confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-primary-600 hover:bg-primary-700';
    const iconWrapperClassName = confirmVariant === 'danger'
        ? 'bg-red-100'
        : 'bg-primary-100';
    const headerIcon = confirmVariant === 'danger'
        ? <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
        : <HandThumbUpIcon className="h-5 w-5 text-primary-600" />;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            headerContent={
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconWrapperClassName}`}>
                        {headerIcon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
            }
        >
            <div className="space-y-5">
                <p className="text-sm text-gray-700">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${confirmClassName}`}
                        disabled={isLoading || confirmDisabled}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
