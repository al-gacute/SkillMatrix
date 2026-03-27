import { AppSettings, BrowseMatrixAccessMode, IUser, ROLE_HIERARCHY } from '../models';

const GLOBAL_APP_SETTINGS_KEY = 'global';

export const DEFAULT_BROWSE_MATRIX_ACCESS: BrowseMatrixAccessMode = 'public';

export const isBrowseMatrixContext = (value: unknown): boolean =>
    value === 'browse_matrix';

export const getBrowseMatrixAccessMode = async (): Promise<BrowseMatrixAccessMode> => {
    const settings = await AppSettings.findOne({ key: GLOBAL_APP_SETTINGS_KEY }).lean();
    return settings?.browseMatrixAccess || DEFAULT_BROWSE_MATRIX_ACCESS;
};

export const getUserRoleLevel = (user?: Pick<IUser, 'role' | 'roleLevel'> | null): number =>
    user?.roleLevel || ROLE_HIERARCHY[user?.role || 'member'] || 1;

export const canBrowseMatrixUser = (
    viewer: Pick<IUser, '_id' | 'role' | 'roleLevel'>,
    target: Pick<IUser, '_id' | 'role' | 'roleLevel' | 'isApproved' | 'isActive'>,
    accessMode: BrowseMatrixAccessMode
): boolean => {
    if (!viewer || !target) {
        return false;
    }

    if (String(viewer._id) === String(target._id)) {
        return false;
    }

    if (target.role === 'admin' || target.isApproved !== true || target.isActive === false) {
        return false;
    }

    if (accessMode === 'public') {
        return true;
    }

    return getUserRoleLevel(target) <= getUserRoleLevel(viewer);
};

export const getGlobalAppSettingsKey = (): string => GLOBAL_APP_SETTINGS_KEY;
