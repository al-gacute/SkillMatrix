import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLogo from '../components/AppLogo';

type LoginLocationState = {
    message?: string;
    clearForm?: boolean;
} | null;

type LoginFieldErrors = {
    email?: string;
    password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateLoginForm = (email: string, password: string): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
        errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
        errors.email = 'Enter a valid email address.';
    }

    if (!password) {
        errors.password = 'Password is required.';
    }

    return errors;
};

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as LoginLocationState;
    const approvalMessage = locationState?.message;

    useEffect(() => {
        if (!locationState?.clearForm) {
            return;
        }

        setEmail('');
        setPassword('');
        setError('');
        setFieldErrors({});
        setLoading(false);
    }, [locationState]);

    const clearFieldError = (field: keyof LoginFieldErrors) => {
        setFieldErrors((currentErrors) => {
            if (!currentErrors[field]) {
                return currentErrors;
            }

            const nextErrors = { ...currentErrors };
            delete nextErrors[field];
            return nextErrors;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const nextFieldErrors = validateLoginForm(email, password);
        setFieldErrors(nextFieldErrors);

        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        setLoading(true);

        try {
            await login(email.trim(), password);
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center">
                        <AppLogo to="/" />
                    </div>
                    <p className="text-gray-600 mt-2">Sign in to your account</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    {approvalMessage && (
                        <div className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm">
                            {approvalMessage}
                        </div>
                    )}

                    <form
                        key={locationState?.clearForm ? 'login-cleared' : 'login-default'}
                        onSubmit={handleSubmit}
                        className="space-y-6"
                        autoComplete="off"
                        noValidate
                    >
                        <div>
                            <label htmlFor="email" className="label">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                    clearFieldError('email');
                                }}
                                className={`input ${fieldErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                autoComplete="off"
                                required
                                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                placeholder="you@example.com"
                            />
                            {fieldErrors.email && (
                                <p id="email-error" className="mt-1 text-sm text-red-600">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="label">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                    clearFieldError('password');
                                }}
                                className={`input ${fieldErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                                autoComplete="new-password"
                                required
                                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                placeholder="••••••••"
                            />
                            {fieldErrors.password && (
                                <p id="password-error" className="mt-1 text-sm text-red-600">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
