import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { PROFICIENCY_LEVELS, PROFICIENCY_LABELS, PROFICIENCY_DESCRIPTIONS } from '../types';
import { useGlobalModalPresence } from '../utils/globalModalState';

const GlobalProficiencyGuide: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    useGlobalModalPresence(isOpen);

    React.useEffect(() => {
        const openGuide = () => setIsOpen(true);

        window.addEventListener('open-proficiency-guide', openGuide);

        return () => {
            window.removeEventListener('open-proficiency-guide', openGuide);
        };
    }, []);

    if (!isAuthenticated || location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center">
                        <div
                            className="fixed inset-0"
                            style={{ backgroundColor: 'rgba(217, 217, 217, 0.5)' }}
                            onClick={() => setIsOpen(false)}
                        />

                        <div className="relative w-full max-w-xl transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
                            <div className="flex items-center justify-between border-b px-6 py-4">
                                <h3 className="text-lg font-semibold text-gray-900">9-Level Skill Progression</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 transition-colors hover:text-gray-500"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="space-y-4 px-6 py-4">
                                <p className="text-sm text-gray-600">
                                    Use this progression as the shared reference for ratings across skills, assessments, and feedback.
                                </p>
                                <div className="space-y-3">
                                    {PROFICIENCY_LEVELS.map((level) => (
                                        <div key={level} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                                                    {level}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">{PROFICIENCY_LABELS[level]}</h3>
                                                    <p className="mt-1 text-sm text-gray-600">{PROFICIENCY_DESCRIPTIONS[level]}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalProficiencyGuide;
