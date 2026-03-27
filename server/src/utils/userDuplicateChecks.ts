import { Types } from 'mongoose';
import { User } from '../models';

interface DuplicateUserCheckInput {
    email?: string;
    firstName?: string;
    lastName?: string;
    excludeUserId?: string | Types.ObjectId;
}

interface DuplicateUserCheckResult {
    duplicateEmail: boolean;
    duplicateName: boolean;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildExactCaseInsensitiveRegex = (value: string): RegExp => new RegExp(`^${escapeRegex(value.trim())}$`, 'i');

export const checkForDuplicateUser = async ({
    email,
    firstName,
    lastName,
    excludeUserId,
}: DuplicateUserCheckInput): Promise<DuplicateUserCheckResult> => {
    const duplicateEmailQuery =
        email && email.trim()
            ? {
                email: buildExactCaseInsensitiveRegex(email.trim()),
                deletedAt: null,
                ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
            }
            : null;

    const duplicateNameQuery =
        firstName && firstName.trim() && lastName && lastName.trim()
            ? {
                firstName: buildExactCaseInsensitiveRegex(firstName.trim()),
                lastName: buildExactCaseInsensitiveRegex(lastName.trim()),
                deletedAt: null,
                ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
            }
            : null;

    const [duplicateEmailUser, duplicateNameUser] = await Promise.all([
        duplicateEmailQuery ? User.exists(duplicateEmailQuery) : Promise.resolve(null),
        duplicateNameQuery ? User.exists(duplicateNameQuery) : Promise.resolve(null),
    ]);

    return {
        duplicateEmail: !!duplicateEmailUser,
        duplicateName: !!duplicateNameUser,
    };
};
