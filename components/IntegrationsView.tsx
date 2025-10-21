import React from 'react';
import { LinkIcon } from './icons/Icons';

interface IntegrationsViewProps {
    connectionStatus: 'live' | 'sample' | 'error';
}

const IntegrationCard: React.FC<{
    name: string;
    iconUrl: string;
    description: string;
    status: 'connected' | 'coming_soon' | 'error';
}> = ({ name, iconUrl, description, status }) => {

    const statusIndicator = {
        connected: { text: 'Connected', color: 'bg-green-500' },
        coming_soon: { text: 'Coming Soon', color: 'bg-gray-500' },
        error: { text: 'Connection Error', color: 'bg-red-500' }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
            <img src={iconUrl} alt={`${name} logo`} className="w-16 h-16 rounded-full bg-white p-1" />
            <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{name}</h3>
                    <span className={`px-2.5 py-1 text-xs font-semibold text-white rounded-full ${statusIndicator[status].color}`}>
                        {statusIndicator[status].text}
                    </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{description}</p>
            </div>
            <button
                disabled={status !== 'connected'}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                Sync Now
            </button>
        </div>
    );
};


const IntegrationsView: React.FC<IntegrationsViewProps> = ({ connectionStatus }) => {
  const canvasStatus = connectionStatus === 'live' ? 'connected' : connectionStatus === 'sample' ? 'connected' : 'error';
  
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">LMS Integrations</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Connect your learning management systems to automate your workflow.</p>

        <div className="space-y-6">
            <IntegrationCard 
                name="Canvas"
                iconUrl="https://play-lh.googleusercontent.com/zuOkMn5rZBkM0qutOiC_Lw-nca23M51O-2rAD_64AbPf2xVf5r_s4CiHnKymqs-c-w"
                description="Sync your courses, assignments, and calendar events automatically."
                status={canvasStatus}
            />
             <IntegrationCard 
                name="Google Classroom"
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Classroom_icon.svg/2048px-Google_Classroom_icon.svg.png"
                description="Integration with Google Classroom is planned for a future update."
                status="coming_soon"
            />
        </div>
    </div>
  );
};

export default IntegrationsView;