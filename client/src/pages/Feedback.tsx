import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { feedbackService, userService, departmentService, sectionService, teamService } from '../services';
import { Feedback, User, Department, Section, Team, ROLE_LABELS, FEEDBACK_TYPE_LABELS, FEEDBACK_TYPE_COLORS, FeedbackType } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ExportIconButton from '../components/ExportIconButton';
import {
    ChatBubbleLeftRightIcon,
    CalendarDaysIcon,
    CheckBadgeIcon,
    PlusIcon,
    CheckCircleIcon,
    HandThumbUpIcon,
    LightBulbIcon,
    StarIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

const feedbackTypeIcons: Record<FeedbackType, React.ElementType> = {
    praise: HandThumbUpIcon,
    constructive: LightBulbIcon,
    suggestion: ChatBubbleLeftRightIcon,
    recognition: StarIcon,
};

const STRENGTH_POINT_VALUE = 1;
const IMPROVEMENT_POINT_VALUE = 1;

const getFeedbackPointSummary = (feedback: Feedback) => ({
    strengthPoints: feedback.strengths.length * STRENGTH_POINT_VALUE,
    improvementPoints: feedback.areasForImprovement.length * IMPROVEMENT_POINT_VALUE,
});

const buildPointEntries = (
    feedbackList: Feedback[],
    pointType: 'strengths' | 'improvements'
) =>
    feedbackList
        .flatMap((feedback) =>
            (pointType === 'strengths' ? feedback.strengths : feedback.areasForImprovement)
                .map((item) => item.trim())
                .filter(Boolean)
                .map((label) => ({
                    label,
                    receivedAt: feedback.createdAt,
                    points: pointType === 'strengths' ? STRENGTH_POINT_VALUE : IMPROVEMENT_POINT_VALUE,
                }))
        )
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

const formatSubmissionDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

const formatSubmissionDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

const formatMonthPeriod = (value: string) => {
    if (!value) {
        return undefined;
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

const escapeSpreadsheetValue = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const buildWorksheetXml = (sheetName: string, rows: string[][]) => {
    const worksheetRows = rows
        .map((row) => `
            <Row>
                ${row
                    .map(
                        (cell) => `
                    <Cell><Data ss:Type="String">${escapeSpreadsheetValue(cell)}</Data></Cell>`
                    )
                    .join('')}
            </Row>`)
        .join('');

    return `
        <Worksheet ss:Name="${escapeSpreadsheetValue(sheetName)}">
            <Table>
                ${worksheetRows}
            </Table>
        </Worksheet>`;
};

const FeedbackTypeColumn: React.FC<{
    type: FeedbackType;
    items: Feedback[];
    currentUserId?: string;
    onView: (feedback: Feedback) => void;
    onAcknowledge: (id: string) => void;
    acknowledgingId?: string | null;
}> = ({ type, items, currentUserId, onView, onAcknowledge, acknowledgingId }) => {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
                No {FEEDBACK_TYPE_LABELS[type].toLowerCase()} yet
            </div>
        );
    }

    const Icon = feedbackTypeIcons[type];

    return (
        <div className="space-y-3">
            {items.map((feedback) => {
                const isGiver = feedback.giver._id === currentUserId;
                const isReceiver = feedback.receiver._id === currentUserId;

                return (
                    <div key={feedback._id} className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className={`flex h-16 w-12 shrink-0 items-center justify-center rounded-lg ${FEEDBACK_TYPE_COLORS[feedback.type]}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-lg font-semibold text-gray-900">{feedback.title}</h3>
                                <div className="mt-1 text-xs text-gray-600">
                                    <div>
                                        {isGiver ? (
                                            <>To: {feedback.receiver.firstName} {feedback.receiver.lastName}</>
                                        ) : (
                                            <>From: {feedback.giver.firstName} {feedback.giver.lastName}</>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 text-gray-400">
                                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                                        <span>Submitted {formatSubmissionDate(feedback.createdAt)}</span>
                                    </div>
                                </div>
                                {feedback.period && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        {feedback.period}{feedback.reviewType ? ` • ${feedback.reviewType}` : ''}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        onClick={() => onView(feedback)}
                                        className="btn btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
                                    >
                                        <EyeIcon className="h-3.5 w-3.5" />
                                        View
                                    </button>
                                    {isReceiver && !feedback.isAcknowledged && (
                                        <button
                                            onClick={() => onAcknowledge(feedback._id)}
                                            className="btn btn-primary px-3 py-1.5 text-xs"
                                            disabled={acknowledgingId === feedback._id}
                                        >
                                            {acknowledgingId === feedback._id ? 'Acknowledging...' : 'Acknowledge'}
                                        </button>
                                    )}
                                    {feedback.isAcknowledged && (
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
                    </div>
                );
            })}
        </div>
    );
};

const strengthOptions = [
    {
        category: 'Cognitive / Thinking Strengths',
        options: [
            'Analytical thinking',
            'Critical thinking',
            'Problem solving',
            'Strategic thinking',
            'Systems thinking',
            'Logical reasoning',
            'Creativity',
            'Innovation',
            'Decision-making',
            'Attention to detail',
            'Root cause analysis',
            'Conceptual thinking',
        ],
    },
    {
        category: 'Execution / Delivery Strengths',
        options: [
            'Time management',
            'Task prioritization',
            'Organization',
            'Productivity / efficiency',
            'Reliability',
            'Accountability',
            'Consistency',
            'Ownership',
            'Ability to meet deadlines',
            'Multitasking',
            'Work discipline',
            'Follow-through',
        ],
    },
    {
        category: 'Interpersonal / Collaboration Strengths',
        options: [
            'Communication (verbal)',
            'Communication (written)',
            'Active listening',
            'Teamwork',
            'Collaboration',
            'Empathy',
            'Relationship building',
            'Stakeholder management',
            'Conflict resolution',
            'Negotiation',
            'Cultural awareness',
        ],
    },
    {
        category: 'Leadership Strengths',
        options: [
            'Leadership',
            'Mentoring / coaching',
            'Delegation',
            'Decision ownership',
            'Influencing others',
            'Vision setting',
            'Team building',
            'Performance management',
            'Motivation of others',
            'Accountability for team outcomes',
        ],
    },
    {
        category: 'Adaptability & Resilience Strengths',
        options: [
            'Flexibility',
            'Learning agility',
            'Openness to feedback',
            'Resilience',
            'Stress tolerance',
            'Handling ambiguity',
            'Change management',
            'Growth mindset',
            'Emotional control',
        ],
    },
    {
        category: 'Learning & Development Strengths',
        options: [
            'Curiosity',
            'Continuous learning',
            'Knowledge sharing',
            'Self-improvement mindset',
            'Teaching / training others',
            'Research ability',
            'Skill acquisition speed',
            'Reflection & self-awareness',
        ],
    },
    {
        category: 'Technical / Functional Strengths',
        options: [
            'Technical proficiency',
            'Domain expertise',
            'System design',
            'Architecture thinking',
            'Data analysis',
            'Debugging',
            'Process improvement',
            'Automation mindset',
            'Tool mastery',
            'Documentation',
        ],
    },
    {
        category: 'Quality, Risk & Compliance Strengths',
        options: [
            'Attention to quality',
            'Risk awareness',
            'Risk mitigation',
            'Compliance adherence',
            'Documentation discipline',
            'Audit readiness',
            'Accuracy',
            'Testing mindset',
            'Safety awareness',
        ],
    },
    {
        category: 'Business & Product Strengths',
        options: [
            'Business understanding',
            'Product thinking',
            'User-centric thinking',
            'Value prioritization',
            'Requirement analysis',
            'Stakeholder alignment',
            'Roadmap planning',
            'Outcome focus',
            'Cost awareness',
            'Process optimization',
        ],
    },
    {
        category: 'Innovation & Strategic Impact Strengths',
        options: [
            'Innovation mindset',
            'Strategic alignment',
            'Big-picture thinking',
            'Opportunity identification',
            'Initiative taking',
            'Change leadership',
            'Thought leadership',
            'Continuous improvement mindset',
        ],
    },
];

const improvementOptions = [
    {
        category: 'Cognitive / Thinking Development',
        options: [
            'Strengthening analytical thinking skills',
            'Developing deeper critical thinking',
            'Improving root cause analysis ability',
            'Expanding strategic thinking',
            'Enhancing creativity and innovation',
            'Building confidence in decision-making',
            'Increasing attention to detail',
            'Deepening understanding of complex concepts',
        ],
    },
    {
        category: 'Execution / Delivery Development',
        options: [
            'Improving time management skills',
            'Strengthening task prioritization',
            'Enhancing consistency in delivery',
            'Building stronger accountability',
            'Improving organization and planning',
            'Increasing productivity and efficiency',
            'Strengthening follow-through on tasks',
            'Learning to manage workload effectively',
        ],
    },
    {
        category: 'Interpersonal / Communication Development',
        options: [
            'Enhancing clarity in communication',
            'Strengthening active listening skills',
            'Improving collaboration with team members',
            'Developing stakeholder engagement skills',
            'Building confidence in difficult conversations',
            'Strengthening conflict resolution approach',
            'Increasing empathy and understanding',
            'Improving written communication and documentation',
        ],
    },
    {
        category: 'Leadership Development',
        options: [
            'Developing leadership confidence',
            'Strengthening delegation skills',
            'Taking greater ownership of decisions',
            'Building influence within the team',
            'Enhancing team motivation skills',
            'Improving feedback delivery',
            'Growing mentoring and coaching ability',
            'Strengthening accountability for team outcomes',
        ],
    },
    {
        category: 'Adaptability & Resilience Development',
        options: [
            'Becoming more adaptable to change',
            'Strengthening openness to feedback',
            'Building resilience under pressure',
            'Improving comfort with ambiguity',
            'Developing a growth mindset',
            'Enhancing emotional control in challenges',
            'Adapting more quickly to new tools/processes',
        ],
    },
    {
        category: 'Learning & Growth Development',
        options: [
            'Increasing initiative in learning',
            'Accelerating skill acquisition',
            'Strengthening curiosity',
            'Sharing knowledge more actively',
            'Applying new learnings effectively',
            'Practicing self-reflection',
            'Becoming more independent in learning',
        ],
    },
    {
        category: 'Technical / Functional Development',
        options: [
            'Strengthening technical foundations',
            'Deepening domain knowledge',
            'Improving debugging and troubleshooting',
            'Enhancing system understanding',
            'Developing documentation skills',
            'Using tools more efficiently',
            'Building automation mindset',
        ],
    },
    {
        category: 'Quality, Risk & Compliance Development',
        options: [
            'Increasing attention to quality',
            'Strengthening testing practices',
            'Improving risk awareness',
            'Enhancing documentation discipline',
            'Ensuring consistent adherence to standards',
            'Improving accuracy in outputs',
            'Building a quality-first mindset',
        ],
    },
    {
        category: 'Business & Product Development',
        options: [
            'Deepening business understanding',
            'Strengthening value prioritization',
            'Improving requirement analysis',
            'Enhancing user-centric thinking',
            'Strengthening stakeholder alignment',
            'Developing roadmap planning skills',
            'Focusing more on outcomes over tasks',
        ],
    },
    {
        category: 'Innovation & Strategic Development',
        options: [
            'Taking more initiative',
            'Strengthening big-picture thinking',
            'Identifying opportunities for improvement',
            'Contributing more innovative ideas',
            'Becoming more proactive',
            'Developing long-term strategic thinking',
            'Driving continuous improvement',
        ],
    },
];

const FeedbackPage: React.FC = () => {
    const { user } = useAuth();
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [pointsModalView, setPointsModalView] = useState<'strengths' | 'improvements' | null>(null);
    const [pointsDateFilter, setPointsDateFilter] = useState({
        startDate: '',
        endDate: '',
    });
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [filter, setFilter] = useState<'all' | 'giver' | 'receiver'>('receiver');
    const [selectionFilters, setSelectionFilters] = useState({
        department: '',
        section: '',
        team: '',
    });
    const [validationErrors, setValidationErrors] = useState({
        department: '',
        section: '',
        team: '',
        receiver: '',
    });

    const [formData, setFormData] = useState({
        receiver: '',
        type: 'praise' as FeedbackType,
        period: '',
        reviewType: 'quarterly' as 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project',
        title: '',
        content: '',
        strengths: [''],
        areasForImprovement: [''],
    });

    useEffect(() => {
        fetchFeedback();
        fetchUsers();
    }, [filter]);

    useEffect(() => {
        fetchOrganizationData();
    }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (filter !== 'all') params.role = filter;
            const response = await feedbackService.getFeedback(params);
            if (response.success) {
                setFeedbackList(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await userService.getUsers();
            if (response.success) {
                setUsers(response.data?.filter(u => (u._id || u.id) !== (user?._id || user?.id)) || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchOrganizationData = async () => {
        try {
            const [departmentResponse, sectionResponse, teamResponse] = await Promise.all([
                departmentService.getDepartments(),
                sectionService.getSections(),
                teamService.getTeams(),
            ]);

            if (departmentResponse.success) {
                setDepartments(departmentResponse.data || []);
            }

            if (sectionResponse.success) {
                setSections(sectionResponse.data || []);
            }

            if (teamResponse.success) {
                setTeams(teamResponse.data || []);
            }
        } catch (error) {
            console.error('Error fetching organization data:', error);
        }
    };

    const resetCreateForm = () => {
        setFormData({
            receiver: '',
            type: 'praise',
            period: '',
            reviewType: 'quarterly',
            title: '',
            content: '',
            strengths: [''],
            areasForImprovement: [''],
        });
        setSelectionFilters({
            department: '',
            section: '',
            team: '',
        });
        setValidationErrors({
            department: '',
            section: '',
            team: '',
            receiver: '',
        });
    };

    const handleCreateFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextValidationErrors = {
            department: selectionFilters.department ? '' : 'Department is required.',
            section: '',
            team: '',
            receiver: formData.receiver ? '' : 'Please select a user after choosing a department.',
        };

        setValidationErrors(nextValidationErrors);

        if (Object.values(nextValidationErrors).some(Boolean)) {
            return;
        }

        try {
            const period = formatMonthPeriod(formData.period);

            const response = await feedbackService.createFeedback({
                receiver: formData.receiver,
                type: formData.type,
                period,
                reviewType: formData.reviewType,
                title: formData.title,
                content: formData.content,
                strengths: formData.strengths.filter((item) => item.trim()),
                areasForImprovement: formData.areasForImprovement.filter((item) => item.trim()),
            });
            if (response.success) {
                setShowCreateModal(false);
                fetchFeedback();
                resetCreateForm();
            }
        } catch (error) {
            console.error('Error creating feedback:', error);
        }
    };

    const handleAcknowledge = async (id: string) => {
        if (acknowledgingId === id) return;

        try {
            setAcknowledgingId(id);
            const response = await feedbackService.acknowledgeFeedback(id);
            if (response.success) {
                setFeedbackList((current) =>
                    current.map((feedback) =>
                        feedback._id === id
                            ? {
                                ...feedback,
                                isAcknowledged: true,
                                acknowledgedAt: response.data?.acknowledgedAt || new Date().toISOString(),
                            }
                            : feedback
                    )
                );

                setSelectedFeedback((current) =>
                    current && current._id === id
                        ? {
                            ...current,
                            isAcknowledged: true,
                            acknowledgedAt: response.data?.acknowledgedAt || new Date().toISOString(),
                        }
                        : current
                );
            }
        } catch (error) {
            console.error('Error acknowledging feedback:', error);
        } finally {
            setAcknowledgingId(null);
        }
    };

    const addStrength = () => setFormData({ ...formData, strengths: [...formData.strengths, ''] });
    const addImprovement = () =>
        setFormData({ ...formData, areasForImprovement: [...formData.areasForImprovement, ''] });

    const updateStrength = (index: number, value: string) => {
        const nextStrengths = [...formData.strengths];
        nextStrengths[index] = value;
        setFormData({ ...formData, strengths: nextStrengths });
    };

    const removeStrength = (index: number) => {
        const nextStrengths = formData.strengths.filter((_, currentIndex) => currentIndex !== index);
        setFormData({ ...formData, strengths: nextStrengths.length > 0 ? nextStrengths : [''] });
    };

    const updateImprovement = (index: number, value: string) => {
        const nextAreas = [...formData.areasForImprovement];
        nextAreas[index] = value;
        setFormData({ ...formData, areasForImprovement: nextAreas });
    };

    const removeImprovement = (index: number) => {
        const nextAreas = formData.areasForImprovement.filter((_, currentIndex) => currentIndex !== index);
        setFormData({ ...formData, areasForImprovement: nextAreas.length > 0 ? nextAreas : [''] });
    };

    const filteredSections = sections.filter((section) => {
        if (!selectionFilters.department) return true;
        const departmentId = typeof section.department === 'string' ? section.department : section.department?._id;
        return departmentId === selectionFilters.department;
    });

    const filteredTeams = teams.filter((team) => {
        if (!selectionFilters.department) {
            return false;
        }

        const departmentId = typeof team.department === 'string' ? team.department : team.department?._id;
        const sectionId = typeof team.section === 'string' ? team.section : team.section?._id;

        if (selectionFilters.department && departmentId !== selectionFilters.department) {
            return false;
        }

        if (selectionFilters.section && sectionId !== selectionFilters.section) {
            return false;
        }

        return true;
    });

    const filteredUsers = users.filter((candidate) => {
        if (!selectionFilters.department) {
            return false;
        }

        const departmentId = typeof candidate.department === 'string' ? candidate.department : candidate.department?._id;
        const teamId = typeof candidate.team === 'string' ? candidate.team : candidate.team?._id;
        const sectionId =
            typeof candidate.team === 'object'
                ? (typeof candidate.team?.section === 'string' ? candidate.team.section : candidate.team?.section?._id)
                : '';

        if (selectionFilters.department && departmentId !== selectionFilters.department) {
            return false;
        }

        if (selectionFilters.section && sectionId !== selectionFilters.section) {
            return false;
        }

        if (selectionFilters.team && teamId !== selectionFilters.team) {
            return false;
        }

        return true;
    });

    const handleTeamSelectionAttempt = () => {
        if (!selectionFilters.department) {
            setValidationErrors((current) => ({
                ...current,
                team: 'Select department before choosing a Team.',
            }));
            return;
        }

        setValidationErrors((current) => ({
            ...current,
            team: '',
        }));
    };

    const handleUserSelectionAttempt = () => {
        if (!selectionFilters.department) {
            setValidationErrors((current) => ({
                ...current,
                receiver: 'Select department before choosing a user.',
            }));
            return;
        }

        setValidationErrors((current) => ({
            ...current,
            receiver: '',
        }));
    };

    const exportRows = (items: Feedback[], mode: 'giver' | 'receiver') => {
        const headers = [
            'Date',
            mode === 'giver' ? 'To' : 'From',
            'Feedback Type',
            'Review Type',
            'Period',
            'Title',
            'Content',
            'Strengths',
            'Areas for Improvement',
            'Acknowledged',
        ];

        const rows = items.map((feedback) => [
            new Date(feedback.createdAt).toLocaleDateString(),
            mode === 'giver'
                ? `${feedback.receiver.firstName} ${feedback.receiver.lastName}`
                : `${feedback.giver.firstName} ${feedback.giver.lastName}`,
            FEEDBACK_TYPE_LABELS[feedback.type],
            feedback.reviewType || '',
            feedback.period || '',
            feedback.title,
            feedback.content,
            feedback.strengths.join(', '),
            feedback.areasForImprovement.join(', '),
            feedback.isAcknowledged ? 'Yes' : 'No',
        ]);

        return [headers, ...rows];
    };

    const handleExportFeedback = async () => {
        try {
            setExporting(true);
            const [givenResponse, receivedResponse] = await Promise.all([
                feedbackService.getFeedback({ role: 'giver' }),
                feedbackService.getFeedback({ role: 'receiver' }),
            ]);

            const givenItems = givenResponse.data || [];
            const receivedItems = receivedResponse.data || [];
            const workbookXml = `<?xml version="1.0"?>
                <?mso-application progid="Excel.Sheet"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                    xmlns:o="urn:schemas-microsoft-com:office:office"
                    xmlns:x="urn:schemas-microsoft-com:office:excel"
                    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                    ${buildWorksheetXml('Received Feedback', exportRows(receivedItems, 'receiver'))}
                    ${buildWorksheetXml('Given Feedback', exportRows(givenItems, 'giver'))}
                </Workbook>`;

            const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 10);

            link.href = url;
            link.download = `feedback-export-${stamp}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting feedback:', error);
        } finally {
            setExporting(false);
        }
    };

    const feedbackTypes: FeedbackType[] = ['praise', 'constructive', 'suggestion', 'recognition'];
    const acknowledgedFeedback = feedbackList.filter((feedback) => feedback.isAcknowledged);
    const filteredAcknowledgedFeedback = acknowledgedFeedback.filter((feedback) => {
        const createdAt = new Date(feedback.createdAt).getTime();
        const startTime = pointsDateFilter.startDate ? new Date(`${pointsDateFilter.startDate}T00:00:00`).getTime() : null;
        const endTime = pointsDateFilter.endDate ? new Date(`${pointsDateFilter.endDate}T23:59:59.999`).getTime() : null;

        if (startTime !== null && createdAt < startTime) {
            return false;
        }

        if (endTime !== null && createdAt > endTime) {
            return false;
        }

        return true;
    });
    const receiverPointTotals = filteredAcknowledgedFeedback.reduce(
        (totals, feedback) => {
            const pointSummary = getFeedbackPointSummary(feedback);

            return {
                strengthPoints: totals.strengthPoints + pointSummary.strengthPoints,
                improvementPoints: totals.improvementPoints + pointSummary.improvementPoints,
            };
        },
        { strengthPoints: 0, improvementPoints: 0 }
    );
    const strengthEntries = buildPointEntries(filteredAcknowledgedFeedback, 'strengths');
    const improvementEntries = buildPointEntries(filteredAcknowledgedFeedback, 'improvements');

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
                    <p className="text-gray-600">Give and receive feedback from your team</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportIconButton
                        onClick={handleExportFeedback}
                        disabled={exporting}
                        title={exporting ? 'Exporting feedback...' : 'Export feedback'}
                    />
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
                        <PlusIcon className="h-5 w-5" />
                        Give User Feedback
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-2">
                    {['giver', 'receiver'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as typeof filter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {f === 'giver' ? 'Given by Me' : 'Received'}
                        </button>
                    ))}
                </div>

                {filter === 'receiver' && (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                            type="button"
                            onClick={() => setPointsModalView('strengths')}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            Strength Points
                            <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPointsModalView('improvements')}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            Improvement Points
                            <CheckBadgeIcon className="h-4 w-4 text-amber-500" />
                        </button>
                    </div>
                )}
            </div>

            {/* Feedback Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {feedbackTypes.map((type) => {
                    const Icon = feedbackTypeIcons[type];
                    const count = feedbackList.filter(f => f.type === type).length;
                    return (
                        <div key={type} className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${FEEDBACK_TYPE_COLORS[type]}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    <p className="text-sm text-gray-500">{FEEDBACK_TYPE_LABELS[type]}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Feedback List */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {feedbackList.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow xl:col-span-4">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No feedback yet</h3>
                        <p className="text-gray-500">Start by giving feedback to a team member</p>
                    </div>
                ) : (
                    feedbackTypes.map((type) => (
                        <FeedbackTypeColumn
                            key={type}
                            type={type}
                            items={feedbackList.filter((feedback) => feedback.type === type)}
                            currentUserId={user?._id || user?.id}
                            acknowledgingId={acknowledgingId}
                            onView={(feedback) => {
                                setSelectedFeedback(feedback);
                                setShowViewModal(true);
                            }}
                            onAcknowledge={handleAcknowledge}
                        />
                    ))
                )}
            </div>

            {/* Create Feedback Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                }}
                title="Give Feedback"
                size="lg"
            >
                <form onSubmit={handleCreateFeedback} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Department</label>
                            <select
                                value={selectionFilters.department}
                                onChange={(e) => {
                                    setSelectionFilters({
                                        department: e.target.value,
                                        section: '',
                                        team: '',
                                    });
                                    setFormData({ ...formData, receiver: '' });
                                    setValidationErrors({
                                        department: '',
                                        section: '',
                                        team: '',
                                        receiver: '',
                                    });
                                }}
                                className={`input select-input ${validationErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                required
                            >
                                <option value="">Select department...</option>
                                {departments.map((department) => (
                                    <option key={department._id} value={department._id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.department && <p className="mt-1 text-xs text-red-600">{validationErrors.department}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Section</label>
                            <select
                                value={selectionFilters.section}
                                onChange={(e) => {
                                    setSelectionFilters({
                                        ...selectionFilters,
                                        section: e.target.value,
                                        team: '',
                                    });
                                    setFormData({ ...formData, receiver: '' });
                                    setValidationErrors((current) => ({
                                        ...current,
                                        section: '',
                                        team: '',
                                        receiver: '',
                                    }));
                                }}
                                className={`input select-input ${validationErrors.section ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                disabled={!selectionFilters.department}
                            >
                                <option value="">Select section...</option>
                                {filteredSections.map((section) => (
                                    <option key={section._id} value={section._id}>
                                        {section.name}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.section && <p className="mt-1 text-xs text-red-600">{validationErrors.section}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Team</label>
                            <select
                                value={selectionFilters.team}
                                onFocus={handleTeamSelectionAttempt}
                                onClick={handleTeamSelectionAttempt}
                                onChange={(e) => {
                                    setSelectionFilters({
                                        ...selectionFilters,
                                        team: e.target.value,
                                    });
                                    setFormData({ ...formData, receiver: '' });
                                    setValidationErrors((current) => ({
                                        ...current,
                                        team: '',
                                        receiver: '',
                                    }));
                                }}
                                className={`input select-input ${validationErrors.team ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            >
                                <option value="">Select team...</option>
                                {filteredTeams.map((team) => (
                                    <option key={team._id} value={team._id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.team && <p className="mt-1 text-xs text-red-600">{validationErrors.team}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">User</label>
                        <select
                            value={formData.receiver}
                            onFocus={handleUserSelectionAttempt}
                            onClick={handleUserSelectionAttempt}
                            onChange={(e) => {
                                setFormData({ ...formData, receiver: e.target.value });
                                setValidationErrors((current) => ({
                                    ...current,
                                    receiver: '',
                                }));
                            }}
                            className={`input select-input ${validationErrors.receiver ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            required
                        >
                            <option value="">Select user...</option>
                            {filteredUsers.map((u) => (
                                <option key={u._id || u.id} value={u._id || u.id}>
                                    {u.firstName} {u.lastName} - {ROLE_LABELS[u.role]}
                                </option>
                            ))}
                        </select>
                        {validationErrors.receiver && <p className="mt-1 text-xs text-red-600">{validationErrors.receiver}</p>}
                    </div>

                    <div>
                        <label className="label">Feedback Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackType })}
                            className="input select-input"
                        >
                            <option value="praise">Praise</option>
                            <option value="constructive">Constructive Feedback</option>
                            <option value="suggestion">Suggestion</option>
                            <option value="recognition">Recognition</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Period</label>
                        <input
                            type="month"
                            value={formData.period}
                            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                            className="input calendar-input"
                        />
                    </div>

                    <div>
                        <label className="label">Type</label>
                        <select
                            value={formData.reviewType}
                            onChange={(e) => setFormData({
                                ...formData,
                                reviewType: e.target.value as 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project',
                            })}
                            className="input select-input"
                        >
                            <option value="quarterly">Quarterly</option>
                            <option value="semi_annual">Semi-Annual</option>
                            <option value="annual">Annual</option>
                            <option value="probation">Probation</option>
                            <option value="project">Project</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Brief summary of your feedback"
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Content</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={5}
                            className="input"
                            placeholder="Provide detailed feedback..."
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Strengths</label>
                        <div className="space-y-2">
                            {formData.strengths.map((strength, index) => (
                                <div key={index} className="flex gap-2">
                                    <select
                                        value={strength}
                                        onChange={(e) => updateStrength(index, e.target.value)}
                                        className="input select-input"
                                    >
                                        <option value="">Select a strength...</option>
                                        {strengthOptions.map((group) => (
                                            <optgroup key={group.category} label={group.category}>
                                                {group.options.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {formData.strengths.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeStrength(index)}
                                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addStrength} className="mt-2 text-sm text-primary-600 hover:underline">
                            + Add Strength
                        </button>
                    </div>

                    <div>
                        <label className="label">Areas for Improvement</label>
                        <div className="space-y-2">
                            {formData.areasForImprovement.map((area, index) => (
                                <div key={index} className="flex gap-2">
                                    <select
                                        value={area}
                                        onChange={(e) => updateImprovement(index, e.target.value)}
                                        className="input select-input"
                                    >
                                        <option value="">Select an area for improvement...</option>
                                        {improvementOptions.map((group) => (
                                            <optgroup key={group.category} label={group.category}>
                                                {group.options.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {formData.areasForImprovement.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeImprovement(index)}
                                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addImprovement} className="mt-2 text-sm text-primary-600 hover:underline">
                            + Add Area
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Send Feedback
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={pointsModalView !== null}
                onClose={() => {
                    setPointsModalView(null);
                    setPointsDateFilter({ startDate: '', endDate: '' });
                }}
                title={pointsModalView === 'strengths' ? 'Strength Points' : 'Improvement Points'}
                size="lg"
                headerContent={
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {pointsModalView === 'strengths' ? 'Strength Points' : 'Improvement Points'}
                        </h3>
                        <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${pointsModalView === 'strengths'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                                }`}
                        >
                            {pointsModalView === 'strengths'
                                ? `${receiverPointTotals.strengthPoints} points`
                                : `${receiverPointTotals.improvementPoints} points`}
                        </span>
                    </div>
                }
            >
                <div>
                    <p className="mb-4 text-sm text-gray-500">
                        Only acknowledged feedback contributes to these totals.
                    </p>
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                value={pointsDateFilter.startDate}
                                onChange={(e) => setPointsDateFilter((current) => ({ ...current, startDate: e.target.value }))}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">End Date</label>
                            <input
                                type="date"
                                value={pointsDateFilter.endDate}
                                onChange={(e) => setPointsDateFilter((current) => ({ ...current, endDate: e.target.value }))}
                                className="input"
                            />
                        </div>
                    </div>
                    {(pointsModalView === 'strengths' ? strengthEntries : improvementEntries).length === 0 ? (
                        <p className="text-sm text-gray-400">No acknowledged points yet.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <span>Criteria</span>
                                <span>Date Received</span>
                                <span>Points</span>
                            </div>
                            <ul className="space-y-3">
                                {(pointsModalView === 'strengths' ? strengthEntries : improvementEntries).map((item, index) => (
                                    <li
                                        key={`${item.label}-${item.receivedAt}-${index}`}
                                        className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-4 text-gray-700"
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-gray-500">{formatSubmissionDate(item.receivedAt)}</span>
                                        <span className="shrink-0 text-sm text-gray-500">
                                            {item.points} {item.points === 1 ? 'point' : 'points'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Modal>

            {/* View Feedback Modal */}
            <Modal
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedFeedback(null);
                }}
                title="Feedback Details"
                size="lg"
            >
                {selectedFeedback && (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${FEEDBACK_TYPE_COLORS[selectedFeedback.type]}`}>
                                {React.createElement(feedbackTypeIcons[selectedFeedback.type], { className: 'h-6 w-6' })}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{selectedFeedback.title}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs ${FEEDBACK_TYPE_COLORS[selectedFeedback.type]}`}>
                                    {FEEDBACK_TYPE_LABELS[selectedFeedback.type]}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">From</p>
                                <p className="font-medium">
                                    {selectedFeedback.giver.firstName} {selectedFeedback.giver.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{ROLE_LABELS[selectedFeedback.giver.role]}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">To</p>
                                <p className="font-medium">
                                    {selectedFeedback.receiver.firstName} {selectedFeedback.receiver.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{ROLE_LABELS[selectedFeedback.receiver.role]}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 mb-2">Content</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.content}</p>
                        </div>

                        {selectedFeedback.period || selectedFeedback.reviewType ? (
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Review Context</p>
                                <p className="text-gray-700">
                                    {[selectedFeedback.period, selectedFeedback.reviewType].filter(Boolean).join(' • ')}
                                </p>
                            </div>
                        ) : null}

                        {selectedFeedback.strengths.length > 0 && (
                            <div>
                                <p className="mb-2 text-sm text-gray-500">Strengths</p>
                                <ul className="space-y-2">
                                    {selectedFeedback.strengths.map((strength, index) => (
                                        <li key={index} className="rounded-lg border border-gray-100 px-3 py-2 text-gray-700">{strength}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selectedFeedback.areasForImprovement.length > 0 && (
                            <div>
                                <p className="mb-2 text-sm text-gray-500">Areas for Improvement</p>
                                <ul className="space-y-2">
                                    {selectedFeedback.areasForImprovement.map((area, index) => (
                                        <li key={index} className="rounded-lg border border-gray-100 px-3 py-2 text-gray-700">{area}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selectedFeedback.overallComments && (
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Overall Comments</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.overallComments}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <CalendarDaysIcon className="h-4 w-4" />
                            <span>Submitted on {formatSubmissionDateTime(selectedFeedback.createdAt)}</span>
                        </div>

                        {selectedFeedback.isAcknowledged && (
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    <span className="font-medium">Acknowledged</span>
                                </div>
                                {selectedFeedback.receiverResponse && (
                                    <p className="mt-2 text-gray-700">{selectedFeedback.receiverResponse}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FeedbackPage;
