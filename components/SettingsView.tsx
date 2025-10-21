import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { testConnection } from '../services/canvasApiService';
import { ExclamationTriangleIcon } from './icons/Icons';

interface SettingsViewProps {
    settings: Settings | null;
    onSave: (settings: Settings) => void;
    onClear: () => void;
    onEnableSampleDataMode: () => void;
    initialError?: string | null;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, onClear, onEnableSampleDataMode, initialError }) => {
    const [canvasUrl, setCanvasUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [displayError, setDisplayError] = useState(initialError);

    useEffect(() => {
        if (settings) {
            setCanvasUrl(settings.canvasUrl);
            setApiToken(settings.apiToken);
        }
    }, [settings]);
    
    useEffect(() => {
        if (initialError) {
            setDisplayError(initialError);
        }
    }, [initialError]);

    const getFormattedUrl = () => {
        let formattedUrl = canvasUrl.trim();
        // Just return the domain, the service will add https://
        formattedUrl = formattedUrl.replace(/^https?:\/\//, '');
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }
        return formattedUrl;
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ canvasUrl: getFormattedUrl(), apiToken: apiToken.trim(), sampleDataMode: false });
        setIsSaved(true);
        setTestStatus('idle');
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleClear = () => {
        setCanvasUrl('');
        setApiToken('');
        onClear();
    }

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        setDisplayError(null);
        try {
            await testConnection(getFormattedUrl(), apiToken.trim());
            setTestStatus('success');
            setTestMessage('Successfully connected to the Canvas API!');
        } catch (err) {
            setTestStatus('error');
            if (err instanceof Error) {
                 setTestMessage(`Connection failed: ${err.message}`);
            } else {
                setTestMessage('An unknown error occurred during the connection test.');
            }
        }
    };

    const handleProceedWithSample = () => {
        onEnableSampleDataMode();
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Connect to your Canvas account to get live data.</p>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
                {displayError && (
                     <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 text-sm">
                         <div className="flex items-start">
                             <ExclamationTriangleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500"/>
                             <div>
                                 <h4 className="font-bold text-red-900 dark:text-red-100">Connection Failed</h4>
                                 <p className="mt-1">
                                     {`The application could not connect to Canvas: "${displayError}".`}
                                     <br/>
                                     Please verify your Canvas URL and API Token are correct and try again.
                                 </p>
                             </div>
                         </div>
                     </div>
                )}
                <form onSubmit={handleSave}>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="canvas-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Canvas URL</label>
                            <input
                                type="url"
                                id="canvas-url"
                                value={canvasUrl}
                                onChange={(e) => { setCanvasUrl(e.target.value); setDisplayError(null); setTestStatus('idle'); }}
                                placeholder="yourschool.instructure.com"
                                required
                                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="api-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Access Token</label>
                            <input
                                type="password"
                                id="api-token"
                                value={apiToken}
                                onChange={(e) => { setApiToken(e.target.value); setDisplayError(null); setTestStatus('idle'); }}
                                placeholder="Enter your generated token"
                                required
                                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    {testStatus === 'success' && (
                        <div className="mt-4 p-3 rounded-md text-sm bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                            {testMessage}
                        </div>
                    )}

                    {testStatus === 'error' && (
                        <div className="mt-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-200 text-sm">
                            <div className="flex items-start">
                                <ExclamationTriangleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-yellow-500"/>
                                <div>
                                    <h4 className="font-bold text-yellow-900 dark:text-yellow-100">Connection Test Failed</h4>
                                    <p className="mt-1">{testMessage}</p>
                                    <p className="mt-3">If the connection test fails, you can still explore the app's features with sample data.</p>
                                    <button
                                        type="button"
                                        onClick={handleProceedWithSample}
                                        className="mt-4 w-full text-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Proceed with Sample Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                             <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                                {isSaved ? 'Saved!' : 'Save Credentials'}
                            </button>
                             <button 
                                type="button" 
                                onClick={handleTestConnection}
                                disabled={!canvasUrl || !apiToken || testStatus === 'testing'}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                             >
                                {testStatus === 'testing' ? (
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 mr-2 border-2 border-gray-800 dark:border-gray-100 border-dashed rounded-full animate-spin"></div>
                                        Testing...
                                    </span>
                                ) : 'Test Connection'}
                            </button>
                        </div>
                        {settings?.apiToken && (
                           <button type="button" onClick={handleClear} className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80 transition-colors">
                                Clear Settings
                           </button>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-600 dark:text-gray-400">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">How to get an API Access Token:</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to your Canvas account.</li>
                    <li>Click on <strong>Account</strong> in the global navigation, then <strong>Settings</strong>.</li>
                    <li>Scroll down to the <strong>Approved Integrations</strong> section.</li>
                    <li>Click on <strong>+ New Access Token</strong>.</li>
                    <li>Give it a purpose (e.g., "Student Platform") and click <strong>Generate Token</strong>.</li>
                    <li>Copy the generated token and paste it above. <strong>It will only be shown once!</strong></li>
                </ol>
            </div>
        </div>
    );
};

export default SettingsView;