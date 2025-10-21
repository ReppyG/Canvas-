import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { AlertCircleIcon } from './icons/Icons';

interface HeaderProps {
    assignments: Assignment[];
    connectionStatus: 'live' | 'sample' | 'none';
}

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);
    
    const upcomingCount = assignments.filter(a => {
        if (!a.due_at) return false;
        const daysUntilDue = Math.ceil((new Date(a.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
    }).length;
    
    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-white">Canvas AI Assistant</h1>
                {connectionStatus === 'sample' && (
                    <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded border border-yellow-700">
                        Sample Data Mode
                    </span>
                )}
                {connectionStatus === 'live' && (
                    <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded border border-green-700">
                        ● Connected
                    </span>
                )}
            </div>
            
            <div className="flex items-center space-x-6">
                <div className="text-sm text-gray-400">
                    {currentTime.toLocaleString()}
                </div>
                
                {upcomingCount > 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                        <AlertCircleIcon className="w-5 h-5 text-yellow-400" />
                        <span className="text-gray-300">
                            {upcomingCount} upcoming assignment{upcomingCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
