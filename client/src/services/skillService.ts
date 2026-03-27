import api from './api';
import { Skill, SkillCategory, ApiResponse } from '../types';

export const skillService = {
    async getSkills(params?: Record<string, string>): Promise<ApiResponse<Skill[]>> {
        const response = await api.get('/skills', { params });
        return response.data;
    },

    async getSkill(id: string): Promise<ApiResponse<Skill>> {
        const response = await api.get(`/skills/${id}`);
        return response.data;
    },

    async createSkill(data: { name: string; description?: string; category: string }): Promise<ApiResponse<Skill>> {
        const response = await api.post('/skills', data);
        return response.data;
    },

    async updateSkill(id: string, data: Partial<Skill>): Promise<ApiResponse<Skill>> {
        const response = await api.put(`/skills/${id}`, data);
        return response.data;
    },

    async deleteSkill(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/skills/${id}`);
        return response.data;
    },

    async getCategories(includeDeleted = false): Promise<ApiResponse<SkillCategory[]>> {
        const response = await api.get('/categories', {
            params: includeDeleted ? { includeDeleted: 'true' } : {},
        });
        return response.data;
    },

    async createCategory(data: { name: string; description?: string; color?: string; icon?: string }): Promise<ApiResponse<SkillCategory>> {
        const response = await api.post('/categories', data);
        return response.data;
    },

    async updateCategory(id: string, data: Partial<SkillCategory>): Promise<ApiResponse<SkillCategory>> {
        const response = await api.put(`/categories/${id}`, data);
        return response.data;
    },

    async deleteCategory(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    },
};
