import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface IProjectPosition extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const projectPositionSchema = new Schema<IProjectPosition>(
    {
        name: {
            type: String,
            required: [true, 'Project position name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

projectPositionSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const ProjectPosition = mongoose.model<IProjectPosition>('ProjectPosition', projectPositionSchema);
