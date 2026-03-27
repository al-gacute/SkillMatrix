import api from './api';
import { Feedback, ApiResponse, FeedbackType, FeedbackVisibility } from '../types';

export const feedbackService = {
    async getFeedback(params?: Record<string, string>): Promise<ApiResponse<Feedback[]>> {
        const response = await api.get('/feedback', { params });
        return response.data;
    },

    async getFeedbackById(id: string): Promise<ApiResponse<Feedback>> {
        const response = await api.get(`/feedback/${id}`);
        return response.data;
    },

    async getStats(): Promise<ApiResponse<{
        given: Array<{ _id: FeedbackType; count: number }>;
        received: Array<{ _id: FeedbackType; count: number; avgRating?: number }>;
        unacknowledged: number;
        recent: Feedback[];
    }>> {
        const response = await api.get('/feedback/stats');
        return response.data;
    },

    async getTeamFeedback(): Promise<ApiResponse<Feedback[]>> {
        const response = await api.get('/feedback/team');
        return response.data;
    },

    async createFeedback(data: {
        receiver: string;
        type: FeedbackType;
        visibility?: FeedbackVisibility;
        title: string;
        content: string;
        period?: string;
        reviewType?: 'quarterly' | 'semi_annual' | 'annual' | 'probation' | 'project';
        strengths?: string[];
        areasForImprovement?: string[];
        overallComments?: string;
        relatedSkill?: string;
        relatedProject?: string;
        rating?: number;
    }): Promise<ApiResponse<Feedback>> {
        const response = await api.post('/feedback', data);
        return response.data;
    },

    async updateFeedback(id: string, data: Partial<Feedback>): Promise<ApiResponse<Feedback>> {
        const response = await api.put(`/feedback/${id}`, data);
        return response.data;
    },

    async deleteFeedback(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete(`/feedback/${id}`);
        return response.data;
    },

    async acknowledgeFeedback(id: string, response?: string): Promise<ApiResponse<Feedback>> {
        const res = await api.put(`/feedback/${id}`, {
            isAcknowledged: true,
            receiverResponse: response,
        });
        return res.data;
    },

    async reviewFeedback(id: string, notes?: string): Promise<ApiResponse<Feedback>> {
        const response = await api.put(`/feedback/${id}`, {
            isReviewed: true,
            managerNotes: notes,
        });
        return response.data;
    },
};
