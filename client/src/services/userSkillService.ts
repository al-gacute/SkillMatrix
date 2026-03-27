import api from './api';
import { UserSkill, ApiResponse, ProficiencyLevel, SkillExperienceEntry } from '../types';

interface AddUserSkillData {
    skill: string;
    proficiencyLevel: ProficiencyLevel;
    experienceEntries?: SkillExperienceEntry[];
    yearsOfExperience?: number;
    notes?: string;
    isPublic?: boolean;
}

export const userSkillService = {
    async getMySkills(): Promise<ApiResponse<UserSkill[]>> {
        const response = await api.get('/user-skills/me');
        return response.data;
    },

    async getUserSkills(userId: string): Promise<ApiResponse<UserSkill[]>> {
        const response = await api.get(`/user-skills/user/${userId}`);
        return response.data;
    },

    async searchBySkill(params: Record<string, string>): Promise<ApiResponse<UserSkill[]>> {
        const response = await api.get('/user-skills/search', { params });
        return response.data;
    },

    async addSkill(data: AddUserSkillData): Promise<ApiResponse<UserSkill>> {
        const response = await api.post('/user-skills', data);
        return response.data;
    },

    async updateSkill(id: string, data: Partial<AddUserSkillData>): Promise<ApiResponse<UserSkill>> {
        const response = await api.put(`/user-skills/${id}`, data);
        return response.data;
    },

    async deleteSkill(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/user-skills/${id}`);
        return response.data;
    },

    async endorseSkill(userSkillId: string, comment?: string): Promise<ApiResponse<unknown>> {
        const response = await api.post(`/user-skills/${userSkillId}/endorse`, { comment });
        return response.data;
    },

    async removeEndorsement(userSkillId: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/user-skills/${userSkillId}/endorse`);
        return response.data;
    },
};
