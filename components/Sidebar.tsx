import React from 'react';
import { Page } from '../types';
import { HomeIcon, BookOpenIcon, ClipboardListIcon, BrainIcon, MessageCircleIcon, LinkIcon, SettingsIcon } from './icons/Icons';
import ThemeSwitcher from './ThemeSwitcher';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { page: Page.Dashboard, icon: <HomeIcon />, label: 'Dashboard' },
    { page: Page.Courses, icon: <BookOpenIcon />, label: 'Courses' },
    { page: Page.Assignments, icon: <ClipboardListIcon />, label: 'Assignments' },
    { page: Page.AiTools, icon: <BrainIcon />, label: 'AI Tools' },
    { page: Page.Chat, icon: <MessageCircleIcon />, label: 'Chat' },
    { page: Page.Integrations, icon: <LinkIcon />, label: 'Integrations' },
  ];

  const NavLink: React.FC<{item: typeof navItems[0]}> = ({ item }) => {
    const isActive = currentPage === item.page;
    return (
        <button
            onClick={() => setCurrentPage(item.page)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
                isActive
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
        >
            {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
            <span>{item.label}</span>
        </button>
    );
  };


  return (
    <div className="w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col border-r border-gray-200 dark:border-gray-700">
      <div className="p-6 h-20 flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">StudyPlatform</h1>
      </div>
       <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.page} item={item} />
          ))}
        </nav>
        <div className="px-4 py-4 mt-4">
             <ThemeSwitcher />
             <button
              onClick={() => setCurrentPage(Page.Settings)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left mt-1 ${
                currentPage === Page.Settings
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;