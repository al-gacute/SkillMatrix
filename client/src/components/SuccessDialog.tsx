import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

interface SuccessDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    actionLabel?: string;
    onClose: () => void;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({
    isOpen,
    title = 'Success',
    message,
    actionLabel = 'OK',
    onClose,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            headerContent={
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                        <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
            }
        >
            <div className="space-y-5">
                <p className="text-sm text-gray-700">{message}</p>
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className="btn-primary">
                        {actionLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SuccessDialog;
