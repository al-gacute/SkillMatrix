import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useGlobalModalPresence } from '../utils/globalModalState';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    headerContent?: React.ReactNode;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-6xl',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', headerContent }) => {
    useGlobalModalPresence(isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
                <div
                    className="fixed inset-0 transition-opacity"
                    style={{ backgroundColor: 'rgba(217, 217, 217, 0.5)' }}
                    onClick={onClose}
                />

                <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full ${sizeClasses[size]}`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        {headerContent || <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="px-6 py-4">{children}</div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
