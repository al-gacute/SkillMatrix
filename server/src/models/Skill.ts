import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface ISkill extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    category: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
    {
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'SkillCategory',
            required: [true, 'Skill category is required'],
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Compound index for unique skill names within a category
skillSchema.index({ name: 1, category: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);
