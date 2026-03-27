import api from './api';
import { ApiResponse, ProjectPosition } from '../types';

export const projectPositionService = {
    async getProjectPositions(includeDeleted = false): Promise<ApiResponse<ProjectPosition[]>> {
        const response = await api.get('/project-positions', {
            params: includeDeleted ? { includeDeleted: 'true' } : {},
        });
        return response.data;
    },

    async createProjectPosition(data: { name: string; description?: string }): Promise<ApiResponse<ProjectPosition>> {
        const response = await api.post('/project-positions', data);
        return response.data;
    },

    async updateProjectPosition(id: string, data: { name: string; description?: string }): Promise<ApiResponse<ProjectPosition>> {
        const response = await api.put(`/project-positions/${id}`, data);
        return response.data;
    },

    async deleteProjectPosition(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/project-positions/${id}`);
        return response.data;
    },
};
