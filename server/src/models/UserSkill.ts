import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

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

export const isValidProficiencyLevel = (value: number): value is ProficiencyLevel =>
    Number.isInteger(value) && value >= 1 && value <= 9;

export const SKILL_EXPERIENCE_TYPES = [
    'Formal Education',
    'Formal Training',
    'Practice / Self Learning',
    'Personal Projects',
    'Professional Work Experience',
    'Advanced Professional Experience',
    'Leadership Experience',
    'Teaching / Mentoring',
    'Certification',
] as const;

export type SkillExperienceType = typeof SKILL_EXPERIENCE_TYPES[number];

interface SkillExperienceEntry {
    type: SkillExperienceType;
    startPeriod?: Date;
    endPeriod?: Date;
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;

const roundYearsOfExperience = (years: number): number => Math.round(years * 10) / 10;
const toStartOfDay = (date: Date): Date => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
};

const toEndOfDay = (date: Date): Date => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);
    return normalizedDate;
};

export const calculateYearsOfExperience = (
    experienceEntries?: Array<Pick<SkillExperienceEntry, 'startPeriod' | 'endPeriod'>>,
    legacyStartPeriod?: Date,
    legacyEndPeriod?: Date
): number | undefined => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const candidateRanges = experienceEntries && experienceEntries.length > 0
        ? experienceEntries
            .filter((entry) => entry.startPeriod)
            .map((entry) => ({
                start: toStartOfDay(new Date(entry.startPeriod as Date)),
                end: entry.endPeriod ? toEndOfDay(new Date(entry.endPeriod)) : new Date(today),
            }))
        : legacyStartPeriod
            ? [{
                start: toStartOfDay(new Date(legacyStartPeriod)),
                end: legacyEndPeriod ? toEndOfDay(new Date(legacyEndPeriod)) : new Date(today),
            }]
            : [];

    const validRanges = candidateRanges
        .filter((range) => !Number.isNaN(range.start.getTime()) && !Number.isNaN(range.end.getTime()) && range.start <= range.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (validRanges.length === 0) {
        return undefined;
    }

    const mergedRanges = [validRanges[0]];

    for (let index = 1; index < validRanges.length; index += 1) {
        const currentRange = validRanges[index];
        const lastMergedRange = mergedRanges[mergedRanges.length - 1];

        if (currentRange.start.getTime() <= lastMergedRange.end.getTime()) {
            lastMergedRange.end = new Date(Math.max(lastMergedRange.end.getTime(), currentRange.end.getTime()));
            continue;
        }

        mergedRanges.push(currentRange);
    }

    const totalMilliseconds = mergedRanges.reduce(
        (sum, range) => sum + (range.end.getTime() - range.start.getTime()),
        0
    );

    return roundYearsOfExperience(totalMilliseconds / (MILLISECONDS_PER_DAY * DAYS_PER_YEAR));
};

export interface IUserSkill extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    skill: mongoose.Types.ObjectId;
    proficiencyLevel: ProficiencyLevel;
    experienceEntries?: SkillExperienceEntry[];
    experienceType?: SkillExperienceType;
    startPeriod?: Date;
    endPeriod?: Date;
    yearsOfExperience?: number;
    notes?: string;
    isPublic: boolean;
    endorsements: mongoose.Types.ObjectId[];
    endorsementCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const userSkillSchema = new Schema<IUserSkill>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        skill: {
            type: Schema.Types.ObjectId,
            ref: 'Skill',
            required: [true, 'Skill is required'],
        },
        proficiencyLevel: {
            type: Number,
            min: 1,
            max: 9,
            required: [true, 'Proficiency level is required'],
        },
        experienceEntries: [{
            type: {
                type: String,
                enum: SKILL_EXPERIENCE_TYPES,
                required: true,
            },
            startPeriod: {
                type: Date,
            },
            endPeriod: {
                type: Date,
            },
        }],
        experienceType: {
            type: String,
            enum: SKILL_EXPERIENCE_TYPES,
        },
        startPeriod: {
            type: Date,
        },
        endPeriod: {
            type: Date,
            validate: {
                validator(this: IUserSkill, value?: Date) {
                    if (!value || !this.startPeriod) {
                        return true;
                    }

                    return value >= this.startPeriod;
                },
                message: 'End period must be on or after the start period',
            },
        },
        yearsOfExperience: {
            type: Number,
            min: 0,
            max: 50,
        },
        notes: {
            type: String,
            maxlength: 500,
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        endorsements: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        endorsementCount: {
            type: Number,
            default: 0,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Compound index for unique user-skill combinations
userSkillSchema.index({ user: 1, skill: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Update endorsement count before saving
userSkillSchema.pre('save', function (next) {
    const hasExperienceEntries = Array.isArray(this.experienceEntries) && this.experienceEntries.length > 0;
    const computedYearsOfExperience = calculateYearsOfExperience(
        this.experienceEntries,
        this.startPeriod,
        this.endPeriod
    );

    if (computedYearsOfExperience !== undefined || hasExperienceEntries || this.startPeriod) {
        this.yearsOfExperience = computedYearsOfExperience;
    }

    this.endorsementCount = this.endorsements.length;
    next();
});

export const UserSkill = mongoose.model<IUserSkill>('UserSkill', userSkillSchema);
