import React from 'react';
import { Assignment } from '../types';
import { format } from 'date-fns';
import { AlertCircleIcon, CheckCircle2Icon, CircleIcon } from './icons/Icons';

interface HeaderProps {
    assignments: Assignment[];
    connectionStatus: 'live' | 'sample';
}

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
    const upcomingAssignments = assignments
        .filter(a => a.due_at && new Date(a.due_at) > new Date())
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
        .slice(0, 3);

    const now = new Date();
    const dateTimeStr = format(now, 'yyyy-MM-dd HH:mm:ss');

    return (
        <header className="bg-gray-800 shadow-md p-4 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold">Canvas AI Assistant</h1>
                <div className="text-sm text-gray-400">
                    {dateTimeStr}
                </div>
            </div>
            
            <div className="flex items-center space-x-4">
                {upcomingAssignments.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                        <AlertCircleIcon className="w-5 h-5 text-yellow-500" />
                        <span className="text-gray-300">
                            {upcomingAssignments.length} upcoming
                        </span>
                    </div>
                )}
                
                <div className="flex items-center space-x-2">
                    {connectionStatus === 'live' ? (
                        <>
                            <CheckCircle2Icon className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-300">Live</span>
                        </>
                    ) : (
                        <>
                            <CircleIcon className="w-5 h-5 text-gray-500" />
                            <span className="text-sm text-gray-300">Sample Data</span>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
