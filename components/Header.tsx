import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { BellIcon, CheckCircleIcon, AlertCircleIcon } from './icons/Icons';

interface HeaderProps {
  assignments: Assignment[];
  connectionStatus: 'live' | 'sample' | 'error';
}

/**
 * Get current date time in UTC YYYY-MM-DD HH:MM:SS format
 */
const getCurrentDateTime = (): string => {
  const now = new Date();
  return now.toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
};

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentDateTime());
  
  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDateTime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const upcomingAssignments = assignments.filter(a => {
    if (!a.due_at) return false;
    const dueDate = new Date(a.due_at);
    const now = new Date();
    const diffInDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 7 && diffInDays >= 0;
  }).length;

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'live':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'sample':
        return <AlertCircleIcon className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertCircleIcon className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'live':
        return 'Connected to Canvas';
      case 'sample':
        return 'Sample Data Mode';
      case 'error':
        return 'Connection Error';
      default:
        return '';
    }
  };

  return (
    <header className="bg-slate-800 text-white px-8 py-4 flex items-center justify-between border-b border-slate-700">
      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-slate-400">Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): </span>
          <span className="font-mono text-white">{currentTime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          <span className="text-slate-300">{getStatusText()}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {upcomingAssignments > 0 && (
          <div className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg">
            <BellIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{upcomingAssignments} Due This Week</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
