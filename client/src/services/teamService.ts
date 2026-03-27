import api from './api';
import { Team, Department, Section, User, ApiResponse } from '../types';

interface TeamDetailResponse extends Team {
    members: User[];
    skillDistribution: Array<{
        _id: {
            skillId: string;
            skillName: string;
            categoryName: string;
            categoryColor: string;
        };
        count: number;
        avgExperience: number;
        proficiencyLevels: string[];
    }>;
}

interface DepartmentDetailResponse extends Department {
    members: User[];
    sections: Section[];
    teams: Team[];
}

export const teamService = {
    async getTeams(
        departmentId?: string,
        sectionId?: string,
        options?: { includeDeleted?: boolean }
    ): Promise<ApiResponse<Team[]>> {
        const params: Record<string, string> = {};
        if (departmentId) params.department = departmentId;
        if (sectionId) params.section = sectionId;
        if (options?.includeDeleted) params.includeDeleted = 'true';
        const response = await api.get('/teams', { params });
        return response.data;
    },

    async getTeam(id: string): Promise<ApiResponse<TeamDetailResponse>> {
        const response = await api.get(`/teams/${id}`);
        return response.data;
    },

    async createTeam(data: { name: string; description?: string; department: string; section?: string; lead?: string }): Promise<ApiResponse<Team>> {
        const response = await api.post('/teams', data);
        return response.data;
    },

    async updateTeam(id: string, data: Partial<Team>): Promise<ApiResponse<Team>> {
        const response = await api.put(`/teams/${id}`, data);
        return response.data;
    },

    async deleteTeam(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/teams/${id}`);
        return response.data;
    },

    async addMember(teamId: string, userId: string): Promise<ApiResponse<User>> {
        const response = await api.post(`/teams/${teamId}/members`, { userId });
        return response.data;
    },

    async removeMember(teamId: string, userId: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/teams/${teamId}/members/${userId}`);
        return response.data;
    },
};

export const departmentService = {
    async getDepartments(includeDeleted = false): Promise<ApiResponse<Department[]>> {
        const response = await api.get('/departments', {
            params: includeDeleted ? { includeDeleted: 'true' } : {},
        });
        return response.data;
    },

    async getDepartment(id: string): Promise<ApiResponse<DepartmentDetailResponse>> {
        const response = await api.get(`/departments/${id}`);
        return response.data;
    },

    async createDepartment(data: { name: string; description?: string; manager?: string }): Promise<ApiResponse<Department>> {
        const response = await api.post('/departments', data);
        return response.data;
    },

    async updateDepartment(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
        const response = await api.put(`/departments/${id}`, data);
        return response.data;
    },

    async deleteDepartment(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/departments/${id}`);
        return response.data;
    },
};

export const sectionService = {
    async getSections(departmentId?: string, includeDeleted = false): Promise<ApiResponse<Section[]>> {
        const params: Record<string, string> = {};
        if (departmentId) {
            params.department = departmentId;
        }
        if (includeDeleted) {
            params.includeDeleted = 'true';
        }
        const response = await api.get('/sections', { params });
        return response.data;
    },

    async createSection(data: { name: string; description?: string; department: string }): Promise<ApiResponse<Section>> {
        const response = await api.post('/sections', data);
        return response.data;
    },

    async updateSection(id: string, data: Partial<Section>): Promise<ApiResponse<Section>> {
        const response = await api.put(`/sections/${id}`, data);
        return response.data;
    },

    async deleteSection(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/sections/${id}`);
        return response.data;
    },
};
