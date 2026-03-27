import api from './api';
import { User, ApiResponse } from '../types';

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

interface AuthResponse {
    user: User;
    token: string;
}

interface RegisterResponse {
    user: User;
    pendingApproval: boolean;
}

export const authService = {
    async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    async register(data: RegisterData): Promise<ApiResponse<RegisterResponse>> {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    async getMe(): Promise<ApiResponse<User>> {
        const response = await api.get('/auth/me');
        return response.data;
    },

    async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
        const response = await api.put('/auth/profile', data);
        return response.data;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
        const response = await api.put('/auth/password', { currentPassword, newPassword });
        return response.data;
    },
};
