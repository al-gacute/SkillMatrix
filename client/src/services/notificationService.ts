import api from './api';
import { ApiResponse, Notification } from '../types';

export const notificationService = {
    // Get all notifications for current user
    getNotifications: async (unreadOnly = false): Promise<ApiResponse<Notification[]>> => {
        const params = unreadOnly ? '?unreadOnly=true' : '';
        const response = await api.get(`/notifications${params}`);
        return response.data;
    },

    // Get unread notification count
    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    // Mark notification as read
    markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    // Mark all notifications as read
    markAllAsRead: async (): Promise<ApiResponse<void>> => {
        const response = await api.put('/notifications/mark-all-read');
        return response.data;
    },

    // Clear all notifications
    clearAll: async (): Promise<ApiResponse<void>> => {
        const response = await api.delete('/notifications/clear-all');
        return response.data;
    },

    // Request a new category and/or skill from admins
    requestCatalogItem: async (data: {
        categoryName?: string;
        skillName?: string;
        existingCategoryId?: string;
        existingCategoryName?: string;
        details?: string;
    }): Promise<ApiResponse<void>> => {
        const response = await api.post('/notifications/catalog-request', data);
        return response.data;
    },

    // Approve user registration
    approveUser: async (
        notificationId: string,
        data: { role?: string; projectPosition?: string; department?: string; section?: string; team?: string }
    ): Promise<ApiResponse<void>> => {
        const response = await api.post(`/notifications/${notificationId}/approve`, data);
        return response.data;
    },

    // Reject user registration
    rejectUser: async (notificationId: string): Promise<ApiResponse<void>> => {
        const response = await api.post(`/notifications/${notificationId}/reject`);
        return response.data;
    },

    // Accept a skill catalog request
    acceptCatalogRequest: async (notificationId: string): Promise<ApiResponse<void>> => {
        const response = await api.post(`/notifications/${notificationId}/catalog-accept`);
        return response.data;
    },

    // Reject a skill catalog request
    rejectCatalogRequest: async (notificationId: string, reason: string): Promise<ApiResponse<void>> => {
        const response = await api.post(`/notifications/${notificationId}/catalog-reject`, { reason });
        return response.data;
    },

    // Delete notification
    deleteNotification: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    },
};
