import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService, userSkillService } from '../services';
import { Assessment, User, UserSkill, ROLE_LABELS, ROLE_LEVELS, PROFICIENCY_LEVELS, ASSESSMENT_TYPE_LABELS, formatProficiencyLevel } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import AssessmentMatrixSnapshot from '../components/AssessmentMatrixSnapshot';
import {
    ClipboardDocumentCheckIcon,
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

const proficiencyColors: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, string> = {
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

const formatMonthPeriod = (value: string) => {
    if (!value) {
        return '';
    }

    const [year, month] = value.split('-');
    const monthIndex = Number(month) - 1;

    if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return value;
    }

    return new Date(Number(year), monthIndex, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });
};

const getAssessmentSkillId = (skill: Assessment['skillRatings'][number]['skill']) =>
    typeof skill === 'string' ? skill : skill._id;

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

const getAssessmentStatusPresentation = (assessment: Assessment, isAssessor: boolean) => {
    if (assessment.assesseeAcknowledged || assessment.status === 'completed') {
        return {
            label: 'Acknowledge',
            className: 'bg-green-100 text-green-800',
        };
    }

    if (assessment.status === 'reviewed' || (!isAssessor && assessment.status === 'submitted')) {
        return {
            label: 'For Review',
            className: 'bg-yellow-100 text-yellow-800',
        };
    }

    if (assessment.status === 'submitted') {
        return {
            label: 'Submitted',
            className: 'bg-blue-100 text-blue-800',
        };
    }

    return {
        label: 'Draft',
        className: 'bg-gray-100 text-gray-800',
    };
};

type AssessmentDetailMaps = {
    skillProficiencies: Record<string, number>;
    skillYears: Record<string, number>;
    skillEndorsements: Record<string, number>;
    skillExperienceEntries: Record<string, ReturnType<typeof getExperienceEntries>>;
};

const createEmptyAssessmentDetailMaps = (): AssessmentDetailMaps => ({
    skillProficiencies: {},
    skillYears: {},
    skillEndorsements: {},
    skillExperienceEntries: {},
});

interface AssessmentDetailsContentProps {
    assessment: Assessment;
    currentUserId?: string;
    detailMaps: AssessmentDetailMaps;
}

const AssessmentDetailsContent: React.FC<AssessmentDetailsContentProps> = ({
    assessment,
    currentUserId,
    detailMaps,
}) => {
    const isAssessor = assessment.assessor._id === currentUserId;
    const statusPresentation = getAssessmentStatusPresentation(assessment, isAssessor);

    return (
        <div className="space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-500">Assessor</p>
                    <p className="font-medium">
                        {assessment.assessor.firstName} {assessment.assessor.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{ROLE_LABELS[assessment.assessor.role]}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Assessee</p>
                    <p className="font-medium">
                        {assessment.assessee.firstName} {assessment.assessee.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{ROLE_LABELS[assessment.assessee.role]}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="font-medium">{assessment.period}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{ASSESSMENT_TYPE_LABELS[assessment.type]}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPresentation.className}`}>
                        {statusPresentation.label}
                    </span>
                </div>
            </div>

            {assessment.skillRatings.length > 0 && (
                <div>
                    <p className="mb-2 text-sm text-gray-500">Assessment by Matrix Skill</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Skill</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Proficiency</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Years</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Endorsements</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Experience Entries</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Assessor Rating</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Optional Comments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {assessment.skillRatings.map((skillRating, index) => {
                                        const skillId = getAssessmentSkillId(skillRating.skill);
                                        const displayedProficiency =
                                            detailMaps.skillProficiencies[skillId] || skillRating.memberRating;

                                        return (
                                            <tr key={`${skillId}-${index}`}>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {typeof skillRating.skill === 'string' ? skillRating.skill : skillRating.skill.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {displayedProficiency ? (
                                                        <span
                                                            className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-semibold ${proficiencyColors[displayedProficiency as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]}`}
                                                        >
                                                            {formatProficiencyLevel(displayedProficiency as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {typeof detailMaps.skillYears[skillId] === 'number' ? `${detailMaps.skillYears[skillId]}y` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {detailMaps.skillEndorsements[skillId] ?? 0}
                                                </td>
                                                <td className="px-4 py-3 align-top text-sm text-gray-600">
                                                    {(detailMaps.skillExperienceEntries[skillId] || []).length > 0 ? (
                                                        <div className="space-y-1">
                                                            {(detailMaps.skillExperienceEntries[skillId] || []).map((entry, entryIndex) => {
                                                                const startLabel = formatExperiencePeriod(entry.startPeriod);
                                                                const endLabel = entry.endPeriod ? formatExperiencePeriod(entry.endPeriod) : 'Present';
                                                                const hasPeriod = startLabel || entry.endPeriod;

                                                                return (
                                                                    <div key={`${skillId}-${entry.type || 'entry'}-${entryIndex}`} className="leading-tight">
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
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {formatProficiencyLevel(skillRating.rating as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)}
                                                </td>
                                                <td className="max-w-xs whitespace-normal break-words px-4 py-3 align-top text-sm text-gray-600">
                                                    {skillRating.comments?.trim() || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {assessment.overallComments && (
                <div>
                    <p className="mb-1 text-sm text-gray-500">Overall Comments</p>
                    <p className="text-gray-700">{assessment.overallComments}</p>
                </div>
            )}

            {assessment.assesseeAcknowledged && (
                <div className="rounded-lg bg-green-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-green-700">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="font-medium">Acknowledged</span>
                    </div>
                    {assessment.assesseeComments && (
                        <p className="text-gray-700">{assessment.assesseeComments}</p>
                    )}
                </div>
            )}
        </div>
    );
};

const Assessments: React.FC = () => {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState<AssessmentDetailMaps>(createEmptyAssessmentDetailMaps);
    const [filter, setFilter] = useState<'all' | 'assessor' | 'assessee'>('assessee');
    const [subordinates, setSubordinates] = useState<User[]>([]);
    const [selectedUserSkills, setSelectedUserSkills] = useState<UserSkill[]>([]);
    const [subordinatesLoading, setSubordinatesLoading] = useState(false);
    const [matrixLoading, setMatrixLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [formData, setFormData] = useState({
        assessee: '',
        period: '',
        type: 'quarterly' as const,
        skillRatings: [] as Array<{ skill: string; memberRating?: number; rating: number; comments?: string }>,
        overallComments: '',
    });
    const assessmentDetailsRef = useRef<HTMLDivElement | null>(null);
    const showPrefilledSkillRatings = false;

    const canCreateAssessment = (user?.role !== 'admin') && ((user?.roleLevel || ROLE_LEVELS[user?.role || ''] || 1) >= 2);

    useEffect(() => {
        fetchAssessments();
    }, [filter]);

    const loadAssessmentDetailMaps = async (assessment: Assessment): Promise<AssessmentDetailMaps> => {
        try {
            const assesseeId = assessment.assessee._id || assessment.assessee.id;
            const response = await userSkillService.getUserSkills(assesseeId);

            return {
                skillProficiencies: (response.data || []).reduce((acc, userSkill) => {
                    acc[userSkill.skill._id] = userSkill.proficiencyLevel;
                    return acc;
                }, {} as Record<string, number>),
                skillYears: (response.data || []).reduce((acc, userSkill) => {
                    if (typeof userSkill.yearsOfExperience === 'number') {
                        acc[userSkill.skill._id] = userSkill.yearsOfExperience;
                    }
                    return acc;
                }, {} as Record<string, number>),
                skillEndorsements: (response.data || []).reduce((acc, userSkill) => {
                    acc[userSkill.skill._id] = userSkill.endorsementCount || 0;
                    return acc;
                }, {} as Record<string, number>),
                skillExperienceEntries: (response.data || []).reduce((acc, userSkill) => {
                    acc[userSkill.skill._id] = getExperienceEntries(userSkill);
                    return acc;
                }, {} as Record<string, ReturnType<typeof getExperienceEntries>>),
            };
        } catch (error) {
            console.error('Error loading assessment proficiencies:', error);
            return createEmptyAssessmentDetailMaps();
        }
    };

    useEffect(() => {
        const loadSelectedAssessmentDetails = async () => {
            if (!showViewModal || !selectedAssessment) {
                setSelectedAssessmentDetails(createEmptyAssessmentDetailMaps());
                return;
            }

            const detailMaps = await loadAssessmentDetailMaps(selectedAssessment);
            setSelectedAssessmentDetails(detailMaps);
        };

        loadSelectedAssessmentDetails();
    }, [selectedAssessment, showViewModal]);

    const fetchAssessments = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (filter !== 'all') params.role = filter;
            const response = await assessmentService.getAssessments(params);
            if (response.success) {
                setAssessments(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching assessments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAssessment = async (id: string) => {
        try {
            const response = await assessmentService.submitAssessment(id);
            if (response.success) {
                fetchAssessments();
            }
        } catch (error) {
            console.error('Error submitting assessment:', error);
        }
    };

    const handleAcknowledge = async (id: string) => {
        if (acknowledgingId === id) return;

        try {
            setAcknowledgingId(id);
            const response = await assessmentService.acknowledgeAssessment(id);
            if (response.success) {
                setAssessments((current) =>
                    current.map((assessment) =>
                        assessment._id === id
                            ? {
                                ...assessment,
                                status: 'completed',
                                assesseeAcknowledged: true,
                                acknowledgedAt: response.data?.acknowledgedAt || new Date().toISOString(),
                            }
                            : assessment
                    )
                );
                setSelectedAssessment((current) =>
                    current && current._id === id
                        ? {
                            ...current,
                            status: 'completed',
                            assesseeAcknowledged: true,
                            acknowledgedAt: response.data?.acknowledgedAt || new Date().toISOString(),
                        }
                        : current
                );
                setShowViewModal(false);
            }
        } catch (error) {
            console.error('Error acknowledging assessment:', error);
        } finally {
            setAcknowledgingId(null);
        }
    };

    const resetCreateForm = () => {
        setFormData({
            assessee: '',
            period: '',
            type: 'quarterly',
            skillRatings: [],
            overallComments: '',
        });
        setSelectedUserSkills([]);
        setCreateError('');
    };

    const handleOpenCreateModal = async () => {
        if (!canCreateAssessment) return;
        resetCreateForm();
        setShowCreateModal(true);
        setSubordinatesLoading(true);

        try {
            const response = await assessmentService.getSubordinates();
            if (response.success) {
                setSubordinates(response.data || []);
            }
        } catch {
            setCreateError('Failed to load subordinate users.');
        } finally {
            setSubordinatesLoading(false);
        }
    };

    const handleAssesseeChange = async (assesseeId: string) => {
        setFormData((current) => ({
            ...current,
            assessee: assesseeId,
            skillRatings: [],
        }));
        setSelectedUserSkills([]);

        if (!assesseeId) {
            return;
        }

        try {
            setMatrixLoading(true);
            const response = await userSkillService.getUserSkills(assesseeId);
            const skills = response.data || [];
            setSelectedUserSkills(skills);
            setFormData((current) => ({
                ...current,
                    assessee: assesseeId,
                    skillRatings: skills.map((userSkill) => ({
                        skill: userSkill.skill._id,
                        memberRating: userSkill.proficiencyLevel,
                        rating: userSkill.proficiencyLevel,
                        comments: '',
                    })),
                }));
        } catch {
            setCreateError('Failed to load the selected user matrix.');
        } finally {
            setMatrixLoading(false);
        }
    };

    const updateSkillRating = (index: number, updates: Partial<{ rating: number; comments?: string }>) => {
        const nextSkillRatings = [...formData.skillRatings];
        nextSkillRatings[index] = {
            ...nextSkillRatings[index],
            ...updates,
        };
        setFormData({ ...formData, skillRatings: nextSkillRatings });
    };

    const updateSkillRatingBySkill = (skillId: string, updates: Partial<{ rating: number; comments?: string }>) => {
        const skillRatingIndex = formData.skillRatings.findIndex((skillRating) => skillRating.skill === skillId);

        if (skillRatingIndex === -1) {
            return;
        }

        updateSkillRating(skillRatingIndex, updates);
    };

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreateLoading(true);

        try {
            const response = await assessmentService.createAssessment({
                assessee: formData.assessee,
                period: formatMonthPeriod(formData.period),
                type: formData.type,
                skillRatings: formData.skillRatings,
                overallComments: formData.overallComments,
            });

            if (response.success) {
                setShowCreateModal(false);
                fetchAssessments();
                resetCreateForm();
            } else {
                setCreateError(response.message || 'Failed to create assessment.');
            }
        } catch (error: any) {
            setCreateError(error.response?.data?.message || 'Failed to create assessment.');
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
                    <p className="text-gray-600">Review assessments given to you or submitted by you</p>
                </div>
                {canCreateAssessment && (
                    <button onClick={handleOpenCreateModal} className="btn btn-primary flex items-center gap-2">
                        <PlusIcon className="h-5 w-5" />
                        Create Assessment
                    </button>
                )}
            </div>

            <div className="flex gap-2">
                {['assessor', 'assessee'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as typeof filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'assessor' ? 'Given by Me' : 'Received'}
                    </button>
                ))}
            </div>

            <div className="grid gap-4">
                {assessments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No assessments found</h3>
                        <p className="text-gray-500">Open a user profile to create an assessment when you have permission.</p>
                    </div>
                ) : (
                    assessments.map((assessment) => {
                        const isAssessor = assessment.assessor._id === (user?._id || user?.id);
                        const statusPresentation = getAssessmentStatusPresentation(assessment, isAssessor);
                        return (
                            <div key={assessment._id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {isAssessor ? (
                                                    <>Assessment for {assessment.assessee.firstName} {assessment.assessee.lastName}</>
                                                ) : (
                                                    <>Assessment by {assessment.assessor.firstName} {assessment.assessor.lastName}</>
                                                )}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPresentation.className}`}>
                                                {statusPresentation.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <ClockIcon className="h-4 w-4" />
                                                {assessment.period}
                                            </span>
                                            <span>{ASSESSMENT_TYPE_LABELS[assessment.type]}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {isAssessor ? (
                                                <span>Assessee: {ROLE_LABELS[assessment.assessee.role]}</span>
                                            ) : (
                                                <span>Assessor: {ROLE_LABELS[assessment.assessor.role]}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAssessment(assessment);
                                                setShowViewModal(true);
                                            }}
                                            className="btn btn-secondary text-sm"
                                        >
                                            View Details
                                        </button>
                                        {isAssessor && assessment.status === 'draft' && (
                                            <button
                                                onClick={() => handleSubmitAssessment(assessment._id)}
                                                className="btn btn-primary text-sm flex items-center gap-1"
                                            >
                                                <CheckCircleIcon className="h-4 w-4" />
                                                Submit
                                            </button>
                                        )}
                                        {!isAssessor && assessment.status === 'submitted' && !assessment.assesseeAcknowledged && (
                                            <button
                                                onClick={() => handleAcknowledge(assessment._id)}
                                                className="btn btn-primary text-sm flex items-center gap-1"
                                                disabled={acknowledgingId === assessment._id}
                                            >
                                                <CheckCircleIcon className="h-4 w-4" />
                                                {acknowledgingId === assessment._id ? 'Acknowledging...' : 'Acknowledge'}
                                            </button>
                                        )}
                                        {!isAssessor && assessment.assesseeAcknowledged && (
                                            <span
                                                className="inline-flex items-center text-green-600"
                                                title="Acknowledged"
                                                aria-label="Acknowledged"
                                            >
                                                <CheckCircleIcon className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Assessment"
                size="2xl"
            >
                <form onSubmit={handleCreateAssessment} className="space-y-4">
                    <p className="text-sm text-gray-500">
                        You can assess members within your department/team based on Role hierarchy.
                    </p>
                    {createError && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {createError}
                        </div>
                    )}

                    <div>
                        <label className="label">Select User</label>
                        <select
                            value={formData.assessee}
                            onChange={(e) => handleAssesseeChange(e.target.value)}
                            className="input"
                            required
                            disabled={subordinatesLoading}
                        >
                            <option value="">{subordinatesLoading ? 'Loading users...' : 'Select a subordinate...'}</option>
                            {subordinates.map((candidate) => (
                                <option key={candidate._id || candidate.id} value={candidate._id || candidate.id}>
                                    {candidate.firstName} {candidate.lastName} - {ROLE_LABELS[candidate.role]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="label">Period</label>
                            <input
                                type="month"
                                value={formData.period}
                                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                className="input calendar-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                                className="input"
                            >
                                <option value="quarterly">Quarterly</option>
                                <option value="semi_annual">Semi-Annual</option>
                                <option value="annual">Annual</option>
                                <option value="probation">Probation</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                    </div>

                    {formData.assessee && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Assessment by Matrix Skill</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Use the selected member’s current matrix as the basis for your assessment.
                            </p>

                            {matrixLoading ? (
                                <p className="mt-4 text-sm text-gray-500">Loading matrix...</p>
                            ) : selectedUserSkills.length === 0 ? (
                                <p className="mt-4 text-sm text-gray-500">No public matrix skills available for this user.</p>
                            ) : (
                                <AssessmentMatrixSnapshot
                                    skills={selectedUserSkills}
                                    skillRatings={formData.skillRatings}
                                    onSkillRatingChange={updateSkillRatingBySkill}
                                />
                            )}
                        </div>
                    )}

                    {showPrefilledSkillRatings && formData.skillRatings.length > 0 && (
                        <div>
                            <div className="mb-2">
                                <label className="label">Assessment by Matrix Skill</label>
                                <p className="text-xs text-gray-500">
                                    Prefilled from the member’s matrix so you can adjust ratings and add assessor comments.
                                </p>
                            </div>
                            <div className="space-y-3">
                                {formData.skillRatings.map((skillRating, index) => {
                                    const matrixSkill = selectedUserSkills.find((userSkill) => userSkill.skill._id === skillRating.skill);
                                    return (
                                        <div key={`${skillRating.skill}-${index}`} className="rounded-lg border border-gray-200 p-4">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{matrixSkill?.skill.name || 'Skill'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Current matrix level: {matrixSkill ? formatProficiencyLevel(matrixSkill.proficiencyLevel) : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="w-full md:max-w-xs">
                                                    <label className="mb-1 block text-xs font-medium text-gray-600">Assessor Rating</label>
                                                    <select
                                                        value={skillRating.rating}
                                                        onChange={(e) => updateSkillRating(index, { rating: Number(e.target.value) })}
                                                        className="input"
                                                    >
                                                        {PROFICIENCY_LEVELS.map((rating) => (
                                                            <option key={rating} value={rating}>
                                                                {formatProficiencyLevel(rating)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <textarea
                                                value={skillRating.comments || ''}
                                                onChange={(e) => updateSkillRating(index, { comments: e.target.value })}
                                                placeholder="Optional comments for this skill..."
                                                className="input mt-3"
                                                rows={3}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="label">Overall Comments</label>
                        <textarea
                            value={formData.overallComments}
                            onChange={(e) => setFormData({ ...formData, overallComments: e.target.value })}
                            rows={4}
                            className="input"
                            placeholder="Overall performance comments..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={createLoading} className="btn btn-primary">
                            {createLoading ? 'Creating...' : 'Create Assessment'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedAssessment(null);
                }}
                title="Assessment Details"
                size="2xl"
            >
                {selectedAssessment && (
                    <div ref={assessmentDetailsRef}>
                        <AssessmentDetailsContent
                            assessment={selectedAssessment}
                            currentUserId={user?._id || user?.id}
                            detailMaps={selectedAssessmentDetails}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Assessments;
