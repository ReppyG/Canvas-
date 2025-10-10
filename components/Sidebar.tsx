import React from 'react';
import { Page } from '../types';
import { HomeIcon, BookOpenIcon, CalendarIcon, DocumentTextIcon, SparklesIcon, NoteIcon, SettingsIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isConfigured: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isConfigured }) => {
  const navItems = [
    { page: Page.Dashboard, icon: <HomeIcon />, label: 'Dashboard', requiresConfig: true },
    { page: Page.Courses, icon: <BookOpenIcon />, label: 'Courses', requiresConfig: true },
    { page: Page.Calendar, icon: <CalendarIcon />, label: 'Calendar', requiresConfig: true },
    { page: Page.Summarizer, icon: <DocumentTextIcon />, label: 'Summarizer', requiresConfig: false },
    { page: Page.Notes, icon: <NoteIcon />, label: 'Notes', requiresConfig: false },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <SparklesIcon className="w-8 h-8 text-blue-400" />
        <h1 className="text-xl font-bold ml-2 text-white">Canvas AI</h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {navItems.map((item) => {
            const isDisabled = item.requiresConfig && !isConfigured;
            return (
              <li key={item.page}>
                <button
                  onClick={() => setCurrentPage(item.page)}
                  disabled={isDisabled}
                  className={`flex items-center w-full px-4 py-3 my-1 text-left text-sm font-medium rounded-lg transition-colors duration-200 ${
                    currentPage === item.page
                      ? 'bg-blue-500 text-white'
                      : isDisabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {React.cloneElement(item.icon, { className: 'w-5 h-5 mr-3' })}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800">
          <button onClick={() => setCurrentPage(Page.Settings)} className={`flex items-center w-full px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors duration-200 ${
              currentPage === Page.Settings
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}>
              <SettingsIcon className="w-5 h-5 mr-3"/>
              Settings
          </button>
      </div>
    </div>
  );
};

export default Sidebar;
