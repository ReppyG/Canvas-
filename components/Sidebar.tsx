
import React from 'react';
import { Page } from '../types';
import { HomeIcon, BookOpenIcon, CalendarIcon, DocumentTextIcon, SparklesIcon, SettingsIcon, BrainIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { page: Page.Dashboard, icon: <HomeIcon />, label: 'Dashboard' },
    { page: Page.Courses, icon: <BookOpenIcon />, label: 'Courses' },
    { page: Page.Calendar, icon: <CalendarIcon />, label: 'Calendar' },
    { page: Page.Summarizer, icon: <DocumentTextIcon />, label: 'Summarizer' },
    { page: Page.StudyGuide, icon: <BrainIcon />, label: 'Study Guide' },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <SparklesIcon className="w-8 h-8 text-blue-400" />
        <h1 className="text-xl font-bold ml-2 text-white">Canvas AI</h1>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <nav className="px-4 py-6">
          <ul>
            {navItems.map((item) => (
                <li key={item.page}>
                  <button
                    onClick={() => setCurrentPage(item.page)}
                    className={`flex items-center w-full px-4 py-3 my-1 text-left text-sm font-medium rounded-lg transition-colors duration-200 ${
                      currentPage === item.page
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {React.cloneElement(item.icon, { className: 'w-5 h-5 mr-3' })}
                    {item.label}
                  </button>
                </li>
              ))}
          </ul>
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
            <button
              onClick={() => setCurrentPage(Page.Settings)}
              className={`flex items-center w-full px-4 py-3 my-1 text-left text-sm font-medium rounded-lg transition-colors duration-200 ${
                currentPage === Page.Settings
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <SettingsIcon className="w-5 h-5 mr-3" />
              Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;