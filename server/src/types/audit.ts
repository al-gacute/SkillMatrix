import mongoose, { Schema } from 'mongoose';

export interface AuditFields {
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    deletedAt?: Date | null;
    deletedBy?: mongoose.Types.ObjectId;
}

export const auditSchemaFields = {
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
} as const;
