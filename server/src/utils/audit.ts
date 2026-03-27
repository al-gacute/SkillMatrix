import { PopulateOptions } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { AuditFields } from '../types/audit';

type AuditActorId = string | { toString(): string } | null | undefined;

export const AUDIT_USER_SELECT = 'firstName lastName email';

export const AUDIT_POPULATE: PopulateOptions[] = [
    { path: 'createdBy', select: AUDIT_USER_SELECT },
    { path: 'updatedBy', select: AUDIT_USER_SELECT },
    { path: 'deletedBy', select: AUDIT_USER_SELECT },
];

export const shouldIncludeDeleted = (value: unknown): boolean =>
    value === true || value === 'true';

export const buildDeletedAtFilter = (
    baseQuery: Record<string, unknown> = {},
    includeDeleted = false
): Record<string, unknown> =>
    includeDeleted
        ? { ...baseQuery }
        : { ...baseQuery, deletedAt: null };

const resolveActorId = (actor: AuditActorId): string | undefined => {
    if (!actor) {
        return undefined;
    }

    return typeof actor === 'string' ? actor : actor.toString();
};

const getRequestActorId = (req: AuthRequest): string | undefined =>
    resolveActorId(req.user?._id);

export const addCreateAuditFieldsForActor = <T extends Record<string, unknown>>(
    payload: T,
    actorId?: AuditActorId
): T & AuditFields => {
    const resolvedActorId = resolveActorId(actorId);
    const auditActor = resolvedActorId as AuditFields['createdBy'];

    return {
        ...payload,
        ...(resolvedActorId ? { createdBy: auditActor, updatedBy: auditActor } : {}),
        deletedAt: null,
    };
};

export const addCreateAuditFields = <T extends Record<string, unknown>>(
    payload: T,
    req: AuthRequest
): T & AuditFields => {
    return addCreateAuditFieldsForActor(payload, getRequestActorId(req));
};

export const addUpdateAuditFieldsForActor = <T extends Record<string, unknown>>(
    payload: T,
    actorId?: AuditActorId
): T & Partial<AuditFields> => {
    const resolvedActorId = resolveActorId(actorId);
    const auditActor = resolvedActorId as AuditFields['updatedBy'];

    return {
        ...payload,
        ...(resolvedActorId ? { updatedBy: auditActor } : {}),
    };
};

export const addUpdateAuditFields = <T extends Record<string, unknown>>(
    payload: T,
    req: AuthRequest
): T & Partial<AuditFields> => {
    return addUpdateAuditFieldsForActor(payload, getRequestActorId(req));
};

type SoftDeletableDocument = {
    set: (path: string, value: unknown) => unknown;
    save: () => Promise<unknown>;
};

export const softDeleteDocument = async (
    document: SoftDeletableDocument,
    req: AuthRequest,
    extraFields: Record<string, unknown> = {}
): Promise<void> => {
    const userId = req.user?._id;

    document.set('deletedAt', new Date());

    if (userId) {
        document.set('deletedBy', userId);
        document.set('updatedBy', userId);
    }

    Object.entries(extraFields).forEach(([key, value]) => {
        document.set(key, value);
    });

    await document.save();
};

export const buildAuditSetUpdate = (
    payload: Record<string, unknown>,
    req: AuthRequest
): { $set: Record<string, unknown> } => ({
    $set: addUpdateAuditFields(payload, req),
});

export const buildSoftDeleteSetUpdate = (
    req: AuthRequest,
    extraFields: Record<string, unknown> = {}
): { $set: Record<string, unknown> } => {
    const actorId = getRequestActorId(req);

    return {
        $set: {
            deletedAt: new Date(),
            deletedBy: actorId || null,
            ...(actorId ? { updatedBy: actorId } : {}),
            ...extraFields,
        },
    };
};
