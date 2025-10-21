import React from 'react';
import { Assignment } from '../types';

interface HeaderProps {
    assignments: Assignment[];
    connectionStatus: 'live' | 'sample' | 'disconnected';
}

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDateTime = (date: Date): string => {
        return date.toISOString().replace('T', ' ').substring(0, 19);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'live':
                return 'bg-green-500';
            case 'sample':
                return 'bg-yellow-500';
            case 'disconnected':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'live':
                return 'Live';
            case 'sample':
                return 'Sample Data';
            case 'disconnected':
                return 'Disconnected';
            default:
                return 'Unknown';
        }
    };

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-8 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-400">
                        <span className="font-medium">Time (UTC):</span>{' '}
                        <span className="text-white font-mono">{formatDateTime(currentTime)}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                        <span className="text-sm text-gray-400">{getStatusText()}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
