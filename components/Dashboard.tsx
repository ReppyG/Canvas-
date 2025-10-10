
import React from 'react';
import { Assignment, CalendarEvent } from '../types';
import { format, isToday, isTomorrow, isWithinInterval, addDays } from 'date-fns';

const Dashboard: React.FC<{ assignments: Assignment[]; calendarEvents: CalendarEvent[] }> = ({ assignments, calendarEvents }) => {
    
    const now = new Date();
    const urgentAssignments = assignments.filter(a => isToday(a.dueDate) || isTomorrow(a.dueDate));
    const upcomingEvents = calendarEvents.filter(e => isWithinInterval(e.date, { start: addDays(now, 2), end: addDays(now, 7) }));

    const getRelativeDate = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold text-white mb-4">Urgent Tasks</h2>
                    <div className="space-y-4">
                        {urgentAssignments.length > 0 ? urgentAssignments.map(assignment => (
                            <div key={assignment.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between transition-transform hover:scale-105 duration-200">
                                <div>
                                    <p className="font-semibold text-white">{assignment.title}</p>
                                    <p className="text-sm text-gray-400">Due {getRelativeDate(assignment.dueDate)}</p>
                                </div>
                                <div className={`text-sm font-bold px-3 py-1 rounded-full ${isToday(assignment.dueDate) ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {getRelativeDate(assignment.dueDate)}
                                </div>
                            </div>
                        )) : (
                            <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                                <p>No urgent tasks. Great job!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <h2 className="text-xl font-semibold text-white mb-4">Upcoming This Week</h2>
                    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                       {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                           <div key={event.id} className="flex items-start">
                               <div className="flex-shrink-0 w-12 text-center">
                                   <p className="text-xs text-gray-400">{format(event.date, 'EEE')}</p>
                                   <p className="font-bold text-lg text-white">{format(event.date, 'd')}</p>
                               </div>
                               <div className="ml-3 border-l-2 border-blue-500 pl-3">
                                   <p className="font-semibold text-white">{event.title}</p>
                                   <p className="text-sm text-gray-400 capitalize">{event.type}</p>
                               </div>
                           </div>
                       )) : (
                            <div className="p-4 text-center text-gray-400">
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
