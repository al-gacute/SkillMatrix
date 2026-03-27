export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    count?: number;
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface QueryParams {
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    category?: string;
    proficiencyLevel?: string;
    department?: string;
    team?: string;
}
