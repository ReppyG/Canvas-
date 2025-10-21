import React from 'react';
import { MessageCircleIcon } from './icons/Icons';

const ChatView: React.FC = () => {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center h-full text-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700 mb-6">
            <MessageCircleIcon className="w-16 h-16 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Real-Time Chat</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
            The group chat and direct messaging features are part of our future roadmap. Stay tuned for updates!
        </p>
    </div>
  );
};

export default ChatView;