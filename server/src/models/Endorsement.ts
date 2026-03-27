import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export interface IEndorsement extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    endorser: mongoose.Types.ObjectId;
    endorsee: mongoose.Types.ObjectId;
    userSkill: mongoose.Types.ObjectId;
    skill: mongoose.Types.ObjectId;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const endorsementSchema = new Schema<IEndorsement>(
    {
        endorser: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Endorser is required'],
        },
        endorsee: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Endorsee is required'],
        },
        userSkill: {
            type: Schema.Types.ObjectId,
            ref: 'UserSkill',
            required: [true, 'UserSkill is required'],
        },
        skill: {
            type: Schema.Types.ObjectId,
            ref: 'Skill',
            required: [true, 'Skill is required'],
        },
        comment: {
            type: String,
            maxlength: 300,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

// Unique constraint: one user can endorse another user's skill only once
endorsementSchema.index({ endorser: 1, userSkill: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Endorsement = mongoose.model<IEndorsement>('Endorsement', endorsementSchema);
