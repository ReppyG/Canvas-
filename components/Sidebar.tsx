

import React from 'react';
// Fix: Import missing Page type
import { Page } from '../types';
// Fix: Import missing icon components
import { HomeIcon, BookOpenIcon, ClipboardListIcon, BrainIcon, MessageCircleIcon, LinkIcon, SettingsIcon } from './icons/Icons';

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
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
        >
            {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
            <span>{item.label}</span>
        </button>
    );
  };


  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 h-20 flex items-center">
        <h1 className="text-2xl font-bold">StudyPlatform</h1>
      </div>
       <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.page} item={item} />
          ))}
        </nav>
        <div className="px-4 py-4 mt-4">
             <button
              onClick={() => setCurrentPage(Page.Settings)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
                currentPage === Page.Settings
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
