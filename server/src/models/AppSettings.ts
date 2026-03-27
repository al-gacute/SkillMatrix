import mongoose, { Document, Schema } from 'mongoose';
import { AuditFields, auditSchemaFields } from '../types/audit';

export type BrowseMatrixAccessMode = 'public' | 'role_hierarchy';

export interface IAppSettings extends Document, AuditFields {
    key: string;
    browseMatrixAccess: BrowseMatrixAccessMode;
    createdAt: Date;
    updatedAt: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        browseMatrixAccess: {
            type: String,
            enum: ['public', 'role_hierarchy'],
            default: 'public',
            required: true,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

export const AppSettings = mongoose.model<IAppSettings>('AppSettings', appSettingsSchema);
