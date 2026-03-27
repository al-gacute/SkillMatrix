import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface INotification extends Document, AuditFields {
    recipient: mongoose.Types.ObjectId;
    type: 'new_user_registration' | 'user_approved' | 'user_rejected' | 'role_assigned' | 'assessment_received' | 'feedback_received' | 'general';
    title: string;
    message: string;
    relatedUser?: mongoose.Types.ObjectId;
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
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['new_user_registration', 'user_approved', 'user_rejected', 'role_assigned', 'assessment_received', 'feedback_received', 'general'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        relatedUser: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isActioned: {
            type: Boolean,
            default: false,
        },
        actionTaken: {
            type: String,
            enum: ['approved', 'rejected'],
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
