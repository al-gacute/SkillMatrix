import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLogo from '../components/AppLogo';

type LoginLocationState = {
    message?: string;
    clearForm?: boolean;
} | null;

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
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
        setLoading(false);
    }, [locationState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
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
                        <AppLogo />
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
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                autoComplete="off"
                                required
                                placeholder="you@example.com"
                            />
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
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                autoComplete="new-password"
                                required
                                placeholder="••••••••"
                            />
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
