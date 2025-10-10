import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { testConnection } from '../services/canvasApiService';

interface SettingsViewProps {
    settings: Settings | null;
    onSave: (settings: Settings) => void;
    onClear: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, onClear }) => {
    const [canvasUrl, setCanvasUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (settings) {
            setCanvasUrl(settings.canvasUrl);
            setApiToken(settings.apiToken);
        }
    }, [settings]);
    
    const getFormattedUrl = () => {
        let formattedUrl = canvasUrl.trim();
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }
        return formattedUrl;
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ canvasUrl: getFormattedUrl(), apiToken: apiToken.trim() });
        setIsSaved(true);
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
        try {
            await testConnection({ canvasUrl: getFormattedUrl(), apiToken: apiToken.trim() });
            setTestStatus('success');
            setTestMessage('Successfully connected to the Canvas API!');
        } catch (err) {
            setTestStatus('error');
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                setTestMessage('Connection failed. This is likely a browser security (CORS) issue. A backend proxy is required for this app to work with live Canvas data.');
            } else if (err instanceof Error) {
                 setTestMessage(`Connection failed: ${err.message}`);
            } else {
                setTestMessage('An unknown error occurred during the connection test.');
            }
        }
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400 mb-8">Connect to your Canvas account to get live data.</p>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <form onSubmit={handleSave}>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="canvas-url" className="block text-sm font-medium text-gray-300 mb-2">Canvas URL</label>
                            <input
                                type="url"
                                id="canvas-url"
                                value={canvasUrl}
                                onChange={(e) => setCanvasUrl(e.target.value)}
                                placeholder="https://canvas.instructure.com"
                                required
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="api-token" className="block text-sm font-medium text-gray-300 mb-2">API Access Token</label>
                            <input
                                type="password"
                                id="api-token"
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                                placeholder="Enter your generated token"
                                required
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    {testStatus !== 'idle' && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${
                            testStatus === 'success' ? 'bg-green-500/20 text-green-300' :
                            testStatus === 'error' ? 'bg-red-500/20 text-red-300' : ''
                        }`}>
                            {testMessage}
                        </div>
                    )}

                    <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                             <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 transition-colors">
                                {isSaved ? 'Saved!' : 'Save Credentials'}
                            </button>
                             <button 
                                type="button" 
                                onClick={handleTestConnection}
                                disabled={!canvasUrl || !apiToken || testStatus === 'testing'}
                                className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                             >
                                {testStatus === 'testing' ? (
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 mr-2 border-2 border-white border-dashed rounded-full animate-spin"></div>
                                        Testing...
                                    </span>
                                ) : 'Test Connection'}
                            </button>
                        </div>
                        {settings && (
                           <button type="button" onClick={handleClear} className="px-4 py-2 bg-red-800/50 text-red-300 text-sm font-medium rounded-md hover:bg-red-800 transition-colors">
                                Clear Settings
                           </button>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="mt-8 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg p-6 text-sm text-gray-400">
                <h3 className="font-semibold text-gray-200 mb-2">How to get an API Access Token:</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to your Canvas account.</li>
                    <li>Click on <strong>Account</strong> in the global navigation, then <strong>Settings</strong>.</li>
                    <li>Scroll down to the <strong>Approved Integrations</strong> section.</li>
                    <li>Click on <strong>+ New Access Token</strong>.</li>
                    <li>Give it a purpose (e.g., "Canvas AI Assistant") and click <strong>Generate Token</strong>.</li>
                    <li>Copy the generated token and paste it above. <strong>It will only be shown once!</strong></li>
                </ol>
            </div>
        </div>
    );
};

export default SettingsView;