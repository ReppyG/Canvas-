import React, { useState } from 'react';
import { Page, Assignment, CalendarEvent } from './types';
import { useSettings } from './hooks/useSettings';
import { useCanvasData } from './hooks/useCanvasData';
import { useAssignmentStatus } from './hooks/useAssignmentStatus';
import { useAuth } from './hooks/useAuth';

// Import components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CoursesView from './components/CoursesView';
import AssignmentsView from './components/AssignmentsView';
import CalendarView from './components/CalendarView';
import AiToolsView from './components/AiToolsView';
import ChatView from './components/ChatView';
import NotesView from './components/NotesView';
import IntegrationsView from './components/IntegrationsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import GlobalAiChat from './components/GlobalAiChat';
import OnboardingView from './components/OnboardingView';
import { SparklesIcon, Loader2Icon } from './components/icons/Icons';

const App: React.FC = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode } = useSettings();
    
    // Enable data fetching once settings are loaded. The hook will handle which service to use (live/mock).
    const dataEnabled = settings !== null && (isConfigured || settings.sampleDataMode);
    const { courses, assignments, calendarEvents, loading, error, connectionStatus, refetchData } = useCanvasData(settings, dataEnabled);
    const { assignmentsWithStatus, handleStatusChange } = useAssignmentStatus(assignments);
    
    const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [assignmentsCourseFilter, setAssignmentsCourseFilter] = useState<string | null>(null);
    const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<number | null>(null);
    
    const handleCourseClick = (courseId: number) => {
        setAssignmentsCourseFilter(courseId.toString());
        setCurrentPage(Page.Assignments);
    };

    const resetAssignmentsCourseFilter = () => {
        setAssignmentsCourseFilter(null);
    };

    const handleAssignmentSelect = (assignment: Assignment) => {
        setAssignmentsCourseFilter(assignment.course_id.toString());
        setHighlightedAssignmentId(assignment.id);
        setCurrentPage(Page.Assignments);
    };
    
    const handleCalendarEventSelect = (calendarEvent: CalendarEvent) => {
        const assignmentToSelect = assignments.find(a => a.id === calendarEvent.id);
        if (assignmentToSelect) {
            handleAssignmentSelect(assignmentToSelect);
        }
    };

    const resetHighlightedAssignment = () => {
        setHighlightedAssignmentId(null);
    };

    const loadingScreen = (message: string) => (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-screen flex flex-col items-center justify-center">
            <Loader2Icon className="w-12 h-12 animate-spin text-blue-500" />
            <p className="mt-4 text-lg">{message}</p>
        </div>
    );

    if (isAuthLoading) {
        return loadingScreen('Authenticating...');
    }
    
    if (!user) {
        return <AuthView />;
    }

    if (settings === null) {
        return loadingScreen('Loading User Settings...');
    }

    if (!isConfigured && !settings.sampleDataMode) {
        return <OnboardingView onSave={saveSettings} onEnableSampleDataMode={enableSampleDataMode} />;
    }
    
    const renderPage = () => {
        switch (currentPage) {
            case Page.Dashboard:
                return <Dashboard assignments={assignmentsWithStatus} calendarEvents={calendarEvents} onCourseClick={handleCourseClick} connectionStatus={connectionStatus} courses={courses} />;
            case Page.Courses:
                return <CoursesView courses={courses} onCourseClick={handleCourseClick} connectionStatus={connectionStatus} />;
            case Page.Assignments:
                return <AssignmentsView assignments={assignmentsWithStatus} courses={courses} onStatusChange={handleStatusChange} initialCourseId={assignmentsCourseFilter} onNavigated={resetAssignmentsCourseFilter} highlightedAssignmentId={highlightedAssignmentId} onHighlightDone={resetHighlightedAssignment} settings={settings} />;
            case Page.Calendar:
                return <CalendarView calendarEvents={calendarEvents} onEventSelect={handleCalendarEventSelect} />;
            case Page.AiTools:
                return <AiToolsView assignments={assignmentsWithStatus} courses={courses} />;
            case Page.Chat:
                return <ChatView />;
            case Page.Notes:
                return <NotesView />;
            case Page.Integrations:
                return <IntegrationsView connectionStatus={connectionStatus} onSync={refetchData} />;
            case Page.Settings:
                return <SettingsView settings={settings} onSave={saveSettings} onClear={clearSettings} onEnableSampleDataMode={enableSampleDataMode} initialError={error} />;
            default:
                return <Dashboard assignments={assignmentsWithStatus} calendarEvents={calendarEvents} onCourseClick={handleCourseClick} connectionStatus={connectionStatus} courses={courses} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} settings={settings} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header assignments={assignmentsWithStatus} courses={courses} connectionStatus={connectionStatus} onAssignmentSelect={handleAssignmentSelect} onSetPage={setCurrentPage} />
                <main className="flex-1 overflow-y-auto p-8 relative">
                    {loading && connectionStatus === 'live' && settings && !settings.sampleDataMode ? (
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
                assignments={assignmentsWithStatus}
            />
        </div>
    );
};

export default App;