import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'completed';

export interface IAssessment extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    assessor: mongoose.Types.ObjectId; // Person giving assessment (higher in hierarchy)
    assessee: mongoose.Types.ObjectId; // Person being assessed (lower in hierarchy)
    period: string; // e.g., "Q1 2026", "Annual 2026"
    type: 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project';
    status: AssessmentStatus;

    // Skill assessments
    skillRatings: {
        skill: mongoose.Types.ObjectId;
        memberRating?: number;
        rating: number; // 1-9 (9-level proficiency scale)
        comments?: string;
    }[];

    // Performance metrics
    performanceRating: number; // 1-9 overall (9-level scale)
    strengths: string[];
    areasForImprovement: string[];
    goals: {
        description: string;
        targetDate?: Date;
        status: 'pending' | 'in_progress' | 'completed';
    }[];

    // Overall comments
    overallComments?: string;

    // Acknowledgment
    assesseeAcknowledged: boolean;
    assesseeComments?: string;
    acknowledgedAt?: Date;

    submittedAt?: Date;
    reviewedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const assessmentSchema = new Schema<IAssessment>(
    {
        assessor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assessee: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        period: {
            type: String,
            required: [true, 'Assessment period is required'],
        },
        type: {
            type: String,
            enum: ['quarterly', 'semi_annual', 'annual', 'probation', 'project'],
            default: 'quarterly',
        },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'reviewed', 'completed'],
            default: 'draft',
        },
        skillRatings: [{
            skill: {
                type: Schema.Types.ObjectId,
                ref: 'Skill',
            },
            memberRating: {
                type: Number,
                min: 1,
                max: 9,
            },
            rating: {
                type: Number,
                min: 1,
                max: 9,
            },
            comments: String,
        }],
        performanceRating: {
            type: Number,
            min: 1,
            max: 9,
        },
        strengths: [{
            type: String,
        }],
        areasForImprovement: [{
            type: String,
        }],
        goals: [{
            description: {
                type: String,
                required: true,
            },
            targetDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed'],
                default: 'pending',
            },
        }],
        overallComments: String,
        assesseeAcknowledged: {
            type: Boolean,
            default: false,
        },
        assesseeComments: String,
        acknowledgedAt: Date,
        submittedAt: Date,
        reviewedAt: Date,
        completedAt: Date,
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
assessmentSchema.index({ assessor: 1, assessee: 1 });
assessmentSchema.index({ assessee: 1, period: 1 });
assessmentSchema.index({ status: 1 });

export const Assessment = mongoose.model<IAssessment>('Assessment', assessmentSchema);
