import { config } from '../config';

const systemUserEmails = config.highLevelAccountEmails
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const getSystemUserEmails = (): string[] => [...systemUserEmails];

export const getSystemUserExclusionClause = (): Record<string, unknown> =>
    systemUserEmails.length > 0
        ? { email: { $nin: systemUserEmails } }
        : {};

export const excludeSystemUserAccounts = (
    query: Record<string, unknown> = {}
): Record<string, unknown> => {
    const exclusionClause = getSystemUserExclusionClause();

    if (Object.keys(exclusionClause).length === 0) {
        return { ...query };
    }

    if (Object.keys(query).length === 0) {
        return exclusionClause;
    }

    return {
        $and: [query, exclusionClause],
    };
};
