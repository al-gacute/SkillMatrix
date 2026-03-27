import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface ISection extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    department: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
    {
        name: {
            type: String,
            required: [true, 'Section name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

sectionSchema.index({ name: 1, department: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Section = mongoose.model<ISection>('Section', sectionSchema);
