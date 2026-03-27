import api from './api';
import { User, UserSkill, ApiResponse, PaginationInfo } from '../types';

interface UserDetailResponse {
    user: User;
    skills: UserSkill[];
}

export const userService = {
    async getUsers(params?: Record<string, string>): Promise<ApiResponse<User[]> & { pagination?: PaginationInfo }> {
        const response = await api.get('/users', { params });
        return response.data;
    },

    async getUser(id: string, params?: Record<string, string>): Promise<ApiResponse<UserDetailResponse>> {
        const response = await api.get(`/users/${id}`, { params });
        return response.data;
    },

    async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },

    async deleteUser(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },

    async deactivateUser(id: string): Promise<ApiResponse<User>> {
        const response = await api.put(`/users/${id}/deactivate`);
        return response.data;
    },

    async reactivateUser(id: string): Promise<ApiResponse<User>> {
        const response = await api.put(`/users/${id}/reactivate`);
        return response.data;
    },

    async resetUserPassword(id: string, newPassword: string): Promise<ApiResponse<void>> {
        const response = await api.put(`/users/${id}/reset-password`, { newPassword });
        return response.data;
    },
};
