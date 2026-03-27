import api from './api';
import { ApiResponse, AuditFields } from '../types';

export type OrganizationScope = 'department' | 'section' | 'team';
export type BrowseMatrixAccessMode = 'public' | 'role_hierarchy';

export interface Role extends AuditFields {
    _id: string;
    name: string;
    key: string;
    level: number;
    organizationScopes?: OrganizationScope[];
    userCount?: number;
    description?: string;
    isSystem: boolean;
    isActive: boolean;
}

export interface CreateRoleData {
    name: string;
    key: string;
    level: number;
    organizationScopes?: OrganizationScope[];
    description?: string;
}

export interface UpdateRoleData {
    name?: string;
    level?: number;
    organizationScopes?: OrganizationScope[];
    description?: string;
    isActive?: boolean;
}

export interface BrowseMatrixAccessSetting {
    browseMatrixAccess: BrowseMatrixAccessMode;
}

export const MANAGER_LEVEL_ROLE_KEYS = [
    'team_leader',
    'group_leader',
    'department_manager',
    'division_manager',
] as const;

export const roleService = {
    async getRoles(includeInactive = false, includeDeleted = false): Promise<ApiResponse<Role[]>> {
        const response = await api.get('/roles', {
            params: {
                ...(includeInactive ? { includeInactive: 'true' } : {}),
                ...(includeDeleted ? { includeDeleted: 'true' } : {}),
            }
        });
        return response.data;
    },

    async getRole(id: string): Promise<ApiResponse<Role>> {
        const response = await api.get(`/roles/${id}`);
        return response.data;
    },

    async getBrowseMatrixAccessSetting(): Promise<ApiResponse<BrowseMatrixAccessSetting>> {
        const response = await api.get('/roles/browse-matrix-access');
        return response.data;
    },

    async updateBrowseMatrixAccessSetting(
        browseMatrixAccess: BrowseMatrixAccessMode
    ): Promise<ApiResponse<BrowseMatrixAccessSetting>> {
        const response = await api.put('/roles/browse-matrix-access', { browseMatrixAccess });
        return response.data;
    },

    async createRole(data: CreateRoleData): Promise<ApiResponse<Role>> {
        const response = await api.post('/roles', data);
        return response.data;
    },

    async updateRole(id: string, data: UpdateRoleData): Promise<ApiResponse<Role>> {
        const response = await api.put(`/roles/${id}`, data);
        return response.data;
    },

    async deleteRole(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/roles/${id}`);
        return response.data;
    },

    async initializeRoles(): Promise<ApiResponse<Role[]>> {
        const response = await api.post('/roles/init');
        return response.data;
    },

    async reorderRoles(roleOrder: { id: string; level: number }[]): Promise<ApiResponse<Role[]>> {
        const response = await api.put('/roles/reorder', { roleOrder });
        return response.data;
    },
};
