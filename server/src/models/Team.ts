import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface ITeam extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    department: mongoose.Types.ObjectId;
    section?: mongoose.Types.ObjectId;
    lead?: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
    {
        name: {
            type: String,
            required: [true, 'Team name is required'],
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
        section: {
            type: Schema.Types.ObjectId,
            ref: 'Section',
        },
        lead: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        members: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Compound index for unique team names within a department
teamSchema.index({ name: 1, department: 1, section: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Team = mongoose.model<ITeam>('Team', teamSchema);
