import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CoursesView from './components/CoursesView';
import CalendarView from './components/CalendarView';
import SummarizerView from './components/SummarizerView';
import NotesView from './components/NotesView';
import Header from './components/Header';
import SettingsView from './components/SettingsView';
import { Page } from './types';
import { useCanvasData } from './hooks/useCanvasData';
import { useSettings } from './hooks/useSettings';
import { BellIcon, XIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode } = useSettings();
  
  // Call useCanvasData unconditionally, but control its execution with a boolean flag.
  const shouldFetchData = isConfigured || !!settings?.sampleDataMode;
  const { courses, assignments, calendarEvents, loading, error, newAssignments, connectionStatus } = useCanvasData(shouldFetchData);


  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');

  useEffect(() => {
    if (newAssignments.length > 0) {
      setNotificationTitle('New Assignments');
      const message = newAssignments.length === 1
          ? `New assignment posted: "${newAssignments[0].title}"`
          : `${newAssignments.length} new assignments have been posted. Check your courses.`;
      setNotificationMessage(message);
      setShowNotification(true);
    }
  }, [newAssignments]);

  // Initial check to prevent flicker and render a loading screen while settings are loaded from storage
  if (settings === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not configured, or if there's a data fetching error, show the settings view.
  // This provides a clear path for the user to correct invalid credentials.
  if ((!isConfigured && !settings.sampleDataMode) || error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
        <SettingsView
          settings={settings}
          onSave={saveSettings}
          onClear={clearSettings}
          onEnableSampleDataMode={enableSampleDataMode}
          // Pass the connection error to the settings view so it can be displayed.
          initialError={error}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.Dashboard:
        return <Dashboard assignments={assignments} calendarEvents={calendarEvents} />;
      case Page.Courses:
        return <CoursesView courses={courses} assignments={assignments} />;
      case Page.Calendar:
        return <CalendarView events={calendarEvents} />;
      case Page.Summarizer:
        return <SummarizerView />;
      case Page.Notes:
        return <NotesView />;
      case Page.Settings:
        return (
          <SettingsView
            settings={settings}
            onSave={saveSettings}
            onClear={clearSettings}
            onEnableSampleDataMode={enableSampleDataMode}
          />
        );
      default:
        return <Dashboard assignments={assignments} calendarEvents={calendarEvents} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
      `}</style>
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header courses={courses} assignments={assignments} connectionStatus={connectionStatus} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6 md:p-8">
          {loading && currentPage !== Page.Settings ? (
             <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
             </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>

      {/* Notification Popup for New Assignments */}
      {showNotification && (
          <div className="fixed top-5 right-5 w-full max-w-sm bg-gray-800 border border-blue-700 rounded-lg shadow-2xl z-50 animate-slide-in-right">
              <div className="p-4">
                  <div className="flex items-start">
                      <div className="flex-shrink-0">
                         <BellIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                          <p className="text-sm font-medium text-white">{notificationTitle}</p>
                          <p className="mt-1 text-sm text-gray-300">{notificationMessage}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex">
                          <button
                              onClick={() => setShowNotification(false)}
                              className="inline-flex text-gray-400 rounded-md hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                          >
                              <span className="sr-only">Close</span>
                              <XIcon className="h-5 w-5" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;