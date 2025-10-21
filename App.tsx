import React, { useState } from 'react';
import { Page } from './types';
import { useSettings } from './hooks/useSettings';
import { useCanvasData } from './hooks/useCanvasData';

// Import components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CoursesView from './components/CoursesView';
import AssignmentsView from './components/AssignmentsView';
import AiToolsView from './components/AiToolsView';
import ChatView from './components/ChatView';
import IntegrationsView from './components/IntegrationsView';
import SettingsView from './components/SettingsView';
import GlobalAiChat from './components/GlobalAiChat';
import { SparklesIcon, Loader2Icon } from './components/icons/Icons';

const App: React.FC = () => {
    const { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode } = useSettings();
    
    // Enable data fetching once settings are loaded. The hook will handle which service to use (live/mock).
    const dataEnabled = settings !== null && (isConfigured || settings.sampleDataMode);
    const { courses, assignments, calendarEvents, loading, error, connectionStatus } = useCanvasData(dataEnabled);
    
    const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
    const [isChatOpen, setIsChatOpen] = useState(false);

    if (settings === null) {
        return (
            <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-screen flex flex-col items-center justify-center">
                <Loader2Icon className="w-12 h-12 animate-spin text-blue-500" />
                <p className="mt-4 text-lg">Loading Application...</p>
            </div>
        );
    }

    if (!isConfigured && !settings.sampleDataMode) {
        return (
             <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 p-4">
                <SettingsView 
                    settings={settings} 
                    onSave={saveSettings} 
                    onClear={clearSettings} 
                    onEnableSampleDataMode={enableSampleDataMode} 
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
                return <CoursesView courses={courses} />;
            case Page.Assignments:
                return <AssignmentsView assignments={assignments} courses={courses} />;
            case Page.AiTools:
                return <AiToolsView assignments={assignments} courses={courses} />;
            case Page.Chat:
                return <ChatView courses={courses} assignments={assignments} />;
            case Page.Integrations:
                return <IntegrationsView connectionStatus={connectionStatus} />;
            case Page.Settings:
                return <SettingsView settings={settings} onSave={saveSettings} onClear={clearSettings} onEnableSampleDataMode={enableSampleDataMode} />;
            default:
                return <Dashboard assignments={assignments} calendarEvents={calendarEvents} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header assignments={assignments} connectionStatus={connectionStatus} />
                <main className="flex-1 overflow-y-auto p-8 relative">
                    {loading && connectionStatus === 'live' ? (
                         <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="text-center">
                                <Loader2Icon className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                                <p className="mt-3">Loading data from Canvas...</p>
                            </div>
                         </div>
                    ) : renderPage()}
                </main>
            </div>
            
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-500 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 dark:shadow-blue-900/30 dark:hover:shadow-blue-900/40 z-20"
                aria-label="Open AI Assistant"
            >
                <SparklesIcon className="w-8 h-8" />
            </button>

            <GlobalAiChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                courses={courses}
                assignments={assignments}
            />
        </div>
    );
};

export default App;