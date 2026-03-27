import api from './api';
import { DashboardStats, ApiResponse, User, Team, Section } from '../types';

interface SkillGap {
    skill: {
        id: string;
        name: string;
        category: {
            name: string;
            color: string;
        };
    };
    usersWithSkill: number;
    totalUsers: number;
    coverage: number;
    proficiencyBreakdown: {
        level1: number;
        level2: number;
        level3: number;
        level4: number;
        level5: number;
        level6: number;
        level7: number;
        level8: number;
        level9: number;
    };
}

interface TopEndorser {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    title?: string;
    endorsementCount: number;
}

interface TrendData {
    skillsAdded: Array<{ _id: { date: string }; count: number }>;
    endorsements: Array<{ _id: { date: string }; count: number }>;
    trendingSkills: Array<{ skillName: string; endorsementCount: number }>;
}

interface OrganizationAlerts {
    usersWithoutTeam: User[];
    usersWithoutProjectPosition: User[];
    teamsWithoutSection: Team[];
    sectionsWithoutDepartment: Section[];
    summary: {
        usersWithoutTeam: number;
        usersWithoutProjectPosition: number;
        teamsWithoutSection: number;
        sectionsWithoutDepartment: number;
    };
}

export const analyticsService = {
    async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
        const response = await api.get('/analytics/dashboard');
        return response.data;
    },

    async getSkillGaps(params?: { teamId?: string; departmentId?: string }): Promise<ApiResponse<SkillGap[]>> {
        const response = await api.get('/analytics/skill-gaps', { params });
        return response.data;
    },

    async getTopEndorsers(): Promise<ApiResponse<TopEndorser[]>> {
        const response = await api.get('/analytics/top-endorsers');
        return response.data;
    },

    async getTrends(): Promise<ApiResponse<TrendData>> {
        const response = await api.get('/analytics/trends');
        return response.data;
    },

    async getOrganizationAlerts(): Promise<ApiResponse<OrganizationAlerts>> {
        const response = await api.get('/analytics/organization-alerts');
        return response.data;
    },
};
