import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface IDepartment extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    manager?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        manager: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

departmentSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
