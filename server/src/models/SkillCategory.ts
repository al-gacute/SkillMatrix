import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface ISkillCategory extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    createdAt: Date;
    updatedAt: Date;
}

const skillCategorySchema = new Schema<ISkillCategory>(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        color: {
            type: String,
            default: '#3B82F6',
        },
        icon: {
            type: String,
            default: 'code',
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

skillCategorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const SkillCategory = mongoose.model<ISkillCategory>('SkillCategory', skillCategorySchema);
