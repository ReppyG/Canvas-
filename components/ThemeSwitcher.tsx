import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './icons/Icons';

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-5 h-5" />
      ) : (
        <SunIcon className="w-5 h-5" />
      )}
      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  );
};

export default ThemeSwitcher;
