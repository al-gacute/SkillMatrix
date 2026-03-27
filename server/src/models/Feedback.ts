import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export type FeedbackType = 'praise' | 'constructive' | 'suggestion' | 'recognition';
export type FeedbackVisibility = 'private' | 'manager_only' | 'public';

export interface IFeedback extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    giver: mongoose.Types.ObjectId; // Person giving feedback
    receiver: mongoose.Types.ObjectId; // Person receiving feedback
    type: FeedbackType;
    visibility: FeedbackVisibility;

    // Feedback content
    title: string;
    content: string;
    period?: string;
    reviewType?: 'quarterly' | 'annual' | 'probation' | 'project';
    strengths: string[];
    areasForImprovement: string[];
    overallComments?: string;

    // Related to specific skill/project
    relatedSkill?: mongoose.Types.ObjectId;
    relatedProject?: string;

    // Rating (optional)
    rating?: number; // 1-9 (9-level proficiency scale)

    // For managers reviewing feedback
    isReviewed: boolean;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    managerNotes?: string;

    // Acknowledgment by receiver
    isAcknowledged: boolean;
    acknowledgedAt?: Date;
    receiverResponse?: string;

    createdAt: Date;
    updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
    {
        giver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['praise', 'constructive', 'suggestion', 'recognition'],
            required: true,
        },
        visibility: {
            type: String,
            enum: ['private', 'manager_only', 'public'],
            default: 'manager_only',
        },
        title: {
            type: String,
            required: [true, 'Feedback title is required'],
            maxlength: 200,
        },
        content: {
            type: String,
            required: [true, 'Feedback content is required'],
            maxlength: 2000,
        },
        period: {
            type: String,
            maxlength: 100,
        },
        reviewType: {
            type: String,
            enum: ['quarterly', 'annual', 'probation', 'project'],
        },
        strengths: {
            type: [String],
            default: [],
        },
        areasForImprovement: {
            type: [String],
            default: [],
        },
        overallComments: {
            type: String,
            maxlength: 2000,
        },
        relatedSkill: {
            type: Schema.Types.ObjectId,
            ref: 'Skill',
        },
        relatedProject: {
            type: String,
            maxlength: 200,
        },
        rating: {
            type: Number,
            min: 1,
            max: 9,
        },
        isReviewed: {
            type: Boolean,
            default: false,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: Date,
        managerNotes: {
            type: String,
            maxlength: 1000,
        },
        isAcknowledged: {
            type: Boolean,
            default: false,
        },
        acknowledgedAt: Date,
        receiverResponse: {
            type: String,
            maxlength: 1000,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
feedbackSchema.index({ giver: 1 });
feedbackSchema.index({ receiver: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
