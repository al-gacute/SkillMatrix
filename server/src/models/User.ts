import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from './Role';
import { AuditFields, auditSchemaFields } from '../types/audit';

export type UserRole = string;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    member: 1,
    team_leader: 2,
    group_leader: 3,
    department_manager: 4,
    division_manager: 5,
    admin: 6,
};

const isSingleAssignmentValue = (value: unknown): boolean =>
    !Array.isArray(value) && (typeof value !== 'string' || !value.includes(','));

export interface IUser extends Document, AuditFields {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: UserRole;
    roleLevel: number;
    projectPosition?: mongoose.Types.ObjectId;
    department?: mongoose.Types.ObjectId;
    team?: mongoose.Types.ObjectId;
    title?: string;
    bio?: string;
    hireDate?: Date;
    isApproved: boolean;
    isActive: boolean;
    deactivatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false,
        },
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
        },
        avatar: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            default: 'member',
            trim: true,
            validate: {
                validator: isSingleAssignmentValue,
                message: 'Role must be a single value',
            },
        },
        roleLevel: {
            type: Number,
            default: 1,
            min: 1,
        },
        projectPosition: {
            type: Schema.Types.ObjectId,
            ref: 'ProjectPosition',
            validate: {
                validator: isSingleAssignmentValue,
                message: 'Company position must be a single value',
            },
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            validate: {
                validator: isSingleAssignmentValue,
                message: 'Department must be a single value',
            },
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            validate: {
                validator: isSingleAssignmentValue,
                message: 'Team must be a single value',
            },
        },
        title: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        hireDate: {
            type: Date,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deactivatedAt: {
            type: Date,
        },
        ...auditSchemaFields,
    },
    {
        timestamps: true,
    }
);

userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: { deletedAt: null },
    }
);

// Update roleLevel when role changes
userSchema.pre('save', async function (next) {
    if (this.isModified('role')) {
        const role = await Role.findOne({ key: this.role }).lean();
        this.roleLevel = role?.level || ROLE_HIERARCHY[this.role] || 1;
    }
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.pre('find', function (next) {
    this.where({ deletedAt: null });
    next();
});

userSchema.pre('findOne', function (next) {
    this.where({ deletedAt: null });
    next();
});

userSchema.pre('findOneAndUpdate', function (next) {
    this.where({ deletedAt: null });
    next();
});

userSchema.pre('countDocuments', function (next) {
    this.where({ deletedAt: null });
    next();
});

userSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();
    const deletedAtMatch = { $match: { deletedAt: null } };

    if (pipeline.length > 0 && '$geoNear' in pipeline[0]) {
        pipeline.splice(1, 0, deletedAtMatch);
    } else {
        pipeline.unshift(deletedAtMatch);
    }

    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
