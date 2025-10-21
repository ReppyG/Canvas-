import React from 'react';
import { Assignment, CalendarEvent } from '../types';
import { format, isToday, isTomorrow, isWithinInterval, addDays } from 'date-fns';

const Dashboard: React.FC<{ assignments: Assignment[]; calendarEvents: CalendarEvent[] }> = ({ assignments, calendarEvents }) => {
    
    const now = new Date();
    const urgentAssignments = assignments.filter(a => a.due_at && (isToday(new Date(a.due_at)) || isTomorrow(new Date(a.due_at))));
    const upcomingEvents = calendarEvents.filter(e => isWithinInterval(e.date, { start: addDays(now, 2), end: addDays(now, 7) }));

    const getRelativeDate = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Urgent Tasks</h2>
                    <div className="space-y-4">
                        {urgentAssignments.length > 0 ? urgentAssignments.map(assignment => {
                            const dueDate = new Date(assignment.due_at!);
                            return (
                                <div key={assignment.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between transition-transform hover:scale-105 duration-200">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{assignment.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Due {getRelativeDate(dueDate)}</p>
                                    </div>
                                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${isToday(dueDate) ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                        {getRelativeDate(dueDate)}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
                                <p>No urgent tasks. Great job!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upcoming This Week</h2>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                       {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                           <div key={event.id} className="flex items-start">
                               <div className="flex-shrink-0 w-12 text-center">
                                   <p className="text-xs text-gray-500 dark:text-gray-400">{format(event.date, 'EEE')}</p>
                                   <p className="font-bold text-lg text-gray-900 dark:text-white">{format(event.date, 'd')}</p>
                               </div>
                               <div className="ml-3 border-l-2 border-blue-500 pl-3">
                                   <p className="font-semibold text-gray-900 dark:text-white">{event.title}</p>
                                   <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{event.type}</p>
                               </div>
                           </div>
                       )) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                <p>Nothing scheduled for the upcoming week.</p>
                            </div>
                       )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;