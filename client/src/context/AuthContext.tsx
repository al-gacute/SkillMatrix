import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, AuthState } from '../types';
import { authService } from '../services';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const navigate = useNavigate();
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    });

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const response = await authService.getMe();
                    if (response.success && response.data) {
                        localStorage.setItem('user', JSON.stringify(response.data));
                        setState({
                            user: response.data,
                            token,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
                    }
                } catch {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
                }
            } else {
                setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
            }
        };

        initAuth();
    }, []);

    const getApiErrorMessage = (error: unknown, fallback: string): string => {
        if (axios.isAxiosError(error)) {
            const responseMessage = error.response?.data?.message;

            if (typeof responseMessage === 'string' && responseMessage.trim()) {
                return responseMessage;
            }
        }

        if (error instanceof Error && error.message.trim()) {
            return error.message;
        }

        return fallback;
    };

    const login = async (email: string, password: string): Promise<void> => {
        try {
            const response = await authService.login({ email, password });
            if (response.success && response.data) {
                const { user, token } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setState({
                    user,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                });
                return;
            }

            throw new Error(response.message || 'Login failed');
        } catch (error) {
            throw new Error(getApiErrorMessage(error, 'Login failed'));
        }
    };

    const register = async (data: { email: string; password: string; firstName: string; lastName: string }): Promise<void> => {
        try {
            const response = await authService.register(data);
            if (!response.success) {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            throw new Error(getApiErrorMessage(error, 'Registration failed'));
        }
    };

    const logout = (): void => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
        navigate('/', { replace: true });
    };

    const updateUser = (user: User): void => {
        localStorage.setItem('user', JSON.stringify(user));
        setState((prev) => ({ ...prev, user }));
    };

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
