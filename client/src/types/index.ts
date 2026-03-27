export type UserRole = string;

export const ROLE_LABELS: Record<string, string> = {
    member: 'Member',
    team_leader: 'Team Leader',
    group_leader: 'Group Leader',
    department_manager: 'Department Manager',
    division_manager: 'Division Manager',
    admin: 'Admin',
};

export const ROLE_LEVELS: Record<string, number> = {
    member: 1,
    team_leader: 2,
    group_leader: 3,
    department_manager: 4,
    division_manager: 5,
    admin: 6,
};

export interface User {
    id: string;
    _id?: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: UserRole;
    roleLevel?: number;
    projectPosition?: ProjectPosition | string;
    department?: Department | string;
    team?: Team | string;
    title?: string;
    bio?: string;
    hireDate?: string;
    isApproved?: boolean;
    isActive?: boolean;
    deactivatedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuditUserSummary {
    id?: string;
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface AuditFields {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
    createdBy?: AuditUserSummary | string;
    updatedBy?: AuditUserSummary | string;
    deletedBy?: AuditUserSummary | string;
}

export interface SkillCategory {
    deletedAt?: string | null;
    _id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    skillCount?: number;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: AuditUserSummary | string;
    updatedBy?: AuditUserSummary | string;
    deletedBy?: AuditUserSummary | string;
}

export interface Skill extends AuditFields {
    _id: string;
    name: string;
    description?: string;
    category: SkillCategory | string;
    assignedUserCount?: number;
}

// 9-Level Proficiency Scale
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
    1: 'Novice / Entry',
    2: 'Advanced Beginner',
    3: 'Competent',
    4: 'Proficient',
    5: 'Skilled / Experienced',
    6: 'Advanced',
    7: 'Expert',
    8: 'Master / Lead',
    9: 'Authority / Mentor',
};

export const PROFICIENCY_SHORT_LABELS: Record<ProficiencyLevel, string> = PROFICIENCY_LABELS;

export const PROFICIENCY_DESCRIPTIONS: Record<ProficiencyLevel, string> = {
    1: 'Little or no experience. Requires constant supervision and step-by-step instructions.',
    2: 'Basic understanding. Performs simple tasks but needs support for routine issues.',
    3: 'Handles routine tasks independently. Can troubleshoot common problems.',
    4: 'Efficient performance in most circumstances. Understands the why behind tasks.',
    5: 'Actively and sufficiently performing with high quality. Operates with minimal supervision.',
    6: 'Performance is above average. Possesses in-depth knowledge of specific tools or processes.',
    7: 'Performs complex tasks under no supervision. Recognized as a go-to person in the team.',
    8: 'Experienced enough to lead small teams or complex projects. Mentors juniors.',
    9: 'Subject Matter Expert (SME). Defines best practices, trains others, and drives innovation.',
};

export const formatProficiencyLevel = (level: ProficiencyLevel): string => `L${level} - ${PROFICIENCY_LABELS[level]}`;

export type SkillExperienceType =
    | 'Formal Education'
    | 'Formal Training'
    | 'Practice / Self Learning'
    | 'Personal Projects'
    | 'Professional Work Experience'
    | 'Advanced Professional Experience'
    | 'Leadership Experience'
    | 'Teaching / Mentoring'
    | 'Certification';

export const SKILL_EXPERIENCE_TYPES: SkillExperienceType[] = [
    'Formal Education',
    'Formal Training',
    'Practice / Self Learning',
    'Personal Projects',
    'Professional Work Experience',
    'Advanced Professional Experience',
    'Leadership Experience',
    'Teaching / Mentoring',
    'Certification',
];

export interface SkillExperienceEntry {
    type: SkillExperienceType;
    startPeriod?: string;
    endPeriod?: string;
}

export interface UserSkill {
    _id: string;
    user: User | string;
    skill: Skill;
    proficiencyLevel: ProficiencyLevel;
    experienceEntries?: SkillExperienceEntry[];
    experienceType?: SkillExperienceType;
    startPeriod?: string;
    endPeriod?: string;
    yearsOfExperience?: number;
    notes?: string;
    isPublic: boolean;
    endorsements: User[];
    endorsementCount: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Department extends AuditFields {
    _id: string;
    name: string;
    description?: string;
    manager?: User | string;
    memberCount?: number;
    sectionCount?: number;
    teamCount?: number;
}

export interface ProjectPosition extends AuditFields {
    _id: string;
    name: string;
    description?: string;
}

export interface Section extends AuditFields {
    _id: string;
    name: string;
    description?: string;
    department: Department | string;
    teamCount?: number;
    userCount?: number;
}

export interface Team extends AuditFields {
    _id: string;
    name: string;
    description?: string;
    department: Department | string;
    section?: Section | string;
    lead?: User | string;
    members?: User[];
    memberCount?: number;
}

export interface Endorsement {
    _id: string;
    endorser: User;
    endorsee: User;
    userSkill: UserSkill | string;
    skill: Skill | string;
    comment?: string;
    createdAt?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    count?: number;
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface DashboardStats {
    overview: {
        totalUsers: number;
        totalSkills: number;
        totalCategories: number;
        totalTeams: number;
        totalDepartments: number;
        totalEndorsements: number;
    };
    skillsByProficiency: Array<{
        _id: ProficiencyLevel;
        count: number;
    }>;
    topSkills: Array<{
        skillName: string;
        categoryName: string;
        categoryColor: string;
        userCount: number;
        totalEndorsements: number;
    }>;
    skillsByCategory: Array<{
        _id: {
            categoryId: string;
            categoryName: string;
            categoryColor: string;
        };
        count: number;
    }>;
}

// Assessment Types
export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'completed';
export type AssessmentType = 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project';

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual',
    probation: 'Probation',
    project: 'Project',
};

export interface SkillRating {
    skill: Skill | string;
    memberRating?: number;
    rating: number;
    comments?: string;
}

export interface AssessmentGoal {
    description: string;
    targetDate?: string;
    status: 'pending' | 'in_progress' | 'completed';
}

export interface Assessment {
    _id: string;
    assessor: User;
    assessee: User;
    period: string;
    type: AssessmentType;
    status: AssessmentStatus;
    skillRatings: SkillRating[];
    performanceRating?: number;
    strengths: string[];
    areasForImprovement: string[];
    goals: AssessmentGoal[];
    overallComments?: string;
    assesseeAcknowledged: boolean;
    assesseeComments?: string;
    acknowledgedAt?: string;
    submittedAt?: string;
    reviewedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// Feedback Types
export type FeedbackType = 'praise' | 'constructive' | 'suggestion' | 'recognition';
export type FeedbackVisibility = 'private' | 'manager_only' | 'public';

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
    praise: 'Praise',
    constructive: 'Constructive Feedback',
    suggestion: 'Suggestion',
    recognition: 'Recognition',
};

export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
    praise: 'bg-green-100 text-green-800',
    constructive: 'bg-yellow-100 text-yellow-800',
    suggestion: 'bg-blue-100 text-blue-800',
    recognition: 'bg-purple-100 text-purple-800',
};

export interface Feedback {
    _id: string;
    giver: User;
    receiver: User;
    type: FeedbackType;
    visibility: FeedbackVisibility;
    title: string;
    content: string;
    period?: string;
    reviewType?: 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project';
    strengths: string[];
    areasForImprovement: string[];
    overallComments?: string;
    relatedSkill?: Skill;
    relatedProject?: string;
    rating?: number;
    isReviewed: boolean;
    reviewedBy?: User;
    reviewedAt?: string;
    managerNotes?: string;
    isAcknowledged: boolean;
    acknowledgedAt?: string;
    receiverResponse?: string;
    createdAt: string;
    updatedAt: string;
}

// Notification Types
export type NotificationType =
    | 'new_user_registration'
    | 'user_approved'
    | 'user_rejected'
    | 'role_assigned'
    | 'assessment_received'
    | 'feedback_received'
    | 'general';

export interface Notification {
    _id: string;
    recipient: User | string;
    type: NotificationType;
    title: string;
    message: string;
    relatedUser?: User;
    metadata?: {
        catalogRequest?: {
            categoryName?: string;
            skillName?: string;
            existingCategoryId?: string;
            existingCategoryName?: string;
            details?: string;
        };
    };
    isRead: boolean;
    isActioned: boolean;
    actionTaken?: 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}
