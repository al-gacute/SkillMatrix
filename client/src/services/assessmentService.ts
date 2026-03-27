import api from './api';
import { Assessment, User, ApiResponse } from '../types';

export const assessmentService = {
    async getAssessments(params?: Record<string, string>): Promise<ApiResponse<Assessment[]>> {
        const response = await api.get('/assessments', { params });
        return response.data;
    },

    async getAssessment(id: string): Promise<ApiResponse<Assessment>> {
        const response = await api.get(`/assessments/${id}`);
        return response.data;
    },

    async getSubordinates(): Promise<ApiResponse<User[]>> {
        const response = await api.get('/assessments/subordinates');
        return response.data;
    },

    async getStats(): Promise<ApiResponse<{
        given: Array<{ _id: string; count: number }>;
        received: Array<{ _id: string; count: number; avgRating?: number }>;
        recent: Assessment[];
    }>> {
        const response = await api.get('/assessments/stats');
        return response.data;
    },

    async createAssessment(data: {
        assessee: string;
        period: string;
        type?: string;
        skillRatings?: Array<{ skill: string; memberRating?: number; rating: number; comments?: string }>;
        performanceRating?: number;
        strengths?: string[];
        areasForImprovement?: string[];
        goals?: Array<{ description: string; targetDate?: string; status?: string }>;
        overallComments?: string;
    }): Promise<ApiResponse<Assessment>> {
        const response = await api.post('/assessments', data);
        return response.data;
    },

    async updateAssessment(id: string, data: Partial<Assessment>): Promise<ApiResponse<Assessment>> {
        const response = await api.put(`/assessments/${id}`, data);
        return response.data;
    },

    async deleteAssessment(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/assessments/${id}`);
        return response.data;
    },

    async acknowledgeAssessment(id: string, comments?: string): Promise<ApiResponse<Assessment>> {
        const response = await api.put(`/assessments/${id}`, {
            assesseeAcknowledged: true,
            assesseeComments: comments,
        });
        return response.data;
    },

    async submitAssessment(id: string): Promise<ApiResponse<Assessment>> {
        const response = await api.put(`/assessments/${id}`, { status: 'submitted' });
        return response.data;
    },
};
