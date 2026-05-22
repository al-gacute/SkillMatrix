import axios from 'axios';

export const AUTH_UNAUTHORIZED_EVENT = 'skillmatrix:unauthorized';

const normalizeApiBaseUrl = (value?: string): string => {
    if (!value || !value.trim()) {
        return '/api';
    }

    return value.replace(/\/+$/, '');
};

const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => {
        const contentTypeHeader = response.headers?.['content-type'];
        const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader.join(';') : contentTypeHeader;

        if (typeof response.data === 'string' && typeof contentType === 'string' && contentType.includes('text/html')) {
            return Promise.reject(
                new Error('API URL is misconfigured. Configure VITE_API_URL to point to your backend /api endpoint.')
            );
        }

        return response;
    },
    (error) => {
        const requestUrl = typeof error.config?.url === 'string'
            ? error.config.url.split('?')[0].replace(/\/+$/, '')
            : '';
        const isExpectedCredentialError =
            requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/password');

        if (error.response?.status === 401 && !isExpectedCredentialError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
        }
        return Promise.reject(error);
    }
);

export default api;
