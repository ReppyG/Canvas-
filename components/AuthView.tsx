import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SparklesIcon, Loader2Icon } from './icons/Icons';
import { AuthErrorCodes } from 'firebase/auth';

const AuthView: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, signup } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLoginView) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (err: any) {
             switch (err.code) {
                case AuthErrorCodes.INVALID_EMAIL:
                    setError('Please enter a valid email address.');
                    break;
                case AuthErrorCodes.USER_DELETED:
                case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
                    setError('Invalid email or password.');
                    break;
                case AuthErrorCodes.EMAIL_EXISTS:
                    setError('An account with this email already exists. Please log in.');
                    break;
                case AuthErrorCodes.WEAK_PASSWORD:
                    setError('Password should be at least 6 characters long.');
                    break;
                default:
                    setError('An unexpected error occurred. Please try again.');
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 p-4 flex items-center justify-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10">
                <div className="text-center">
                    <SparklesIcon className="w-12 h-12 text-blue-500 mx-auto mb-4"/>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isLoginView ? 'Welcome Back' : 'Create Your Account'}</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{isLoginView ? 'Sign in to access your dashboard.' : 'Get started with your AI-powered student platform.'}</p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={isLoginView ? 'current-password' : 'new-password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isLoginView ? '••••••••' : 'At least 6 characters'}
                            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                        >
                            {isLoading ? <Loader2Icon className="w-5 h-5 animate-spin" /> : (isLoginView ? 'Log In' : 'Sign Up')}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                        {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthView;