import React, { useState } from 'react';
import { Settings } from '../types';
import { testConnection } from '../services/canvasApiService';
import { SparklesIcon, LinkIcon, ExclamationTriangleIcon, Loader2Icon, ExternalLinkIcon } from './icons/Icons';

interface OnboardingViewProps {
    onSave: (settings: Settings) => void;
    onEnableSampleDataMode: () => void;
}

type SetupStep = 'welcome' | 'url' | 'token';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const OnboardingView: React.FC<OnboardingViewProps> = ({ onSave, onEnableSampleDataMode }) => {
    const [step, setStep] = useState<SetupStep>('welcome');
    const [canvasUrl, setCanvasUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [testMessage, setTestMessage] = useState('');

    const getFormattedUrl = () => {
        let formattedUrl = canvasUrl.trim();
        formattedUrl = formattedUrl.replace(/^https?:\/\//, '');
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }
        return formattedUrl;
    };

    const handleTestAndSave = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            const formattedUrl = getFormattedUrl();
            await testConnection(formattedUrl, apiToken.trim());
            setTestStatus('success');
            setTestMessage('Success! Connecting to your dashboard...');
            onSave({ canvasUrl: formattedUrl, apiToken: apiToken.trim(), sampleDataMode: false });
        } catch (err) {
            setTestStatus('error');
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setTestMessage(`Connection failed: ${message}`);
        }
    };

    const renderWelcome = () => (
        <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto flex items-center justify-center mb-6 ring-8 ring-blue-50 dark:ring-blue-900/20">
                <SparklesIcon className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to your AI Student Platform</h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Connect your Canvas account to automatically sync your courses, assignments, and calendar events.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                    onClick={() => setStep('url')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-base"
                >
                    <LinkIcon className="w-5 h-5"/>
                    Connect to Canvas
                </button>
                <button
                    onClick={onEnableSampleDataMode}
                    className="w-full sm:w-auto px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-base"
                >
                    Use Sample Data
                </button>
            </div>
        </div>
    );
    
    const renderUrlStep = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Step 1: Enter your Canvas URL</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">This is the web address you use to log in to Canvas.</p>
            <div className="mt-8 max-w-md mx-auto">
                <input
                    type="url"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    placeholder="yourschool.instructure.com"
                    className="w-full text-center text-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-md py-3 px-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && canvasUrl.trim() && setStep('token')}
                />
                <button
                    onClick={() => setStep('token')}
                    disabled={!canvasUrl.trim()}
                    className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
    
    const renderTokenStep = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Step 2: Generate an Access Token</h2>
            <div className="mt-8 max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-600 dark:text-gray-400">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-base">Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>
                            Click the button below to open your Canvas settings in a new tab.
                            <a
                                href={`https://${getFormattedUrl()}/profile/settings`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <ExternalLinkIcon className="w-4 h-4" />
                                Go to Canvas Settings
                            </a>
                        </li>
                        <li>Scroll down to <strong>Approved Integrations</strong> and click <strong>+ New Access Token</strong>.</li>
                        <li>Give it a name (e.g., "Student Platform") and click <strong>Generate Token</strong>.</li>
                        <li>Copy the token and paste it into the field on the right. <strong>It will only be shown once!</strong></li>
                    </ol>
                </div>
                <div className="space-y-4">
                    <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => { setApiToken(e.target.value); setTestStatus('idle'); }}
                        placeholder="Paste your token here"
                        className="w-full text-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-md py-3 px-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleTestAndSave}
                        disabled={!apiToken.trim() || testStatus === 'testing'}
                        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
                    >
                        {testStatus === 'testing' && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                        {testStatus === 'testing' ? 'Connecting...' : 'Test & Save Connection'}
                    </button>
                    {testStatus === 'error' && (
                        <div className="mt-4 p-3 rounded-md text-sm bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                            <span>{testMessage}</span>
                        </div>
                    )}
                     {testStatus === 'success' && (
                        <div className="mt-4 p-3 rounded-md text-sm bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                            {testMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 p-4 flex items-center justify-center">
            <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
                {step === 'welcome' && renderWelcome()}
                {step === 'url' && renderUrlStep()}
                {step === 'token' && renderTokenStep()}
            </div>
        </div>
    );
};

export default OnboardingView;
