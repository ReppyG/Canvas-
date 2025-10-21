import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { format } from 'date-fns';

interface HeaderProps {
  assignments: Assignment[];
  connectionStatus: 'live' | 'mock' | 'connecting';
}

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const urgentCount = assignments.filter(a => {
    if (!a.due_at) return false;
    const dueDate = new Date(a.due_at);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue < 24;
  }).length;

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'live':
        return 'text-green-400';
      case 'mock':
        return 'text-yellow-400';
      case 'connecting':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Canvas AI Assistant</h1>
          <span className={`text-sm ${getConnectionStatusColor()}`}>
            {connectionStatus === 'live' ? '● Live' : connectionStatus === 'mock' ? '● Demo Mode' : '● Connecting...'}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          {urgentCount > 0 && (
            <div className="flex items-center space-x-2 bg-red-900/30 px-3 py-1 rounded-full">
              <span className="text-red-400 text-sm font-medium">
                {urgentCount} urgent {urgentCount === 1 ? 'assignment' : 'assignments'}
              </span>
            </div>
          )}
          <div className="text-sm text-gray-400">
            {formatDateTime(currentTime)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
