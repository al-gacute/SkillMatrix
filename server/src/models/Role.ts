import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface IRole extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    key: string;
    level: number;
    organizationScopes?: ('department' | 'section' | 'team')[];
    description?: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: [true, 'Role name is required'],
            trim: true,
        },
        key: {
            type: String,
            required: [true, 'Role key is required'],
            lowercase: true,
            trim: true,
        },
        level: {
            type: Number,
            required: [true, 'Role level is required'],
            min: 1,
        },
        organizationScopes: {
            type: [String],
            enum: ['department', 'section', 'team'],
            default: [],
        },
        description: {
            type: String,
            default: '',
        },
        isSystem: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Index for sorting by level
roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Role = mongoose.model<IRole>('Role', roleSchema);
