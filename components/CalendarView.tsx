import React, { useState, useMemo } from 'react';
import { CalendarEvent } from '../types';
// Fix: Standardized date-fns imports to resolve module resolution errors. The previous errors about
// missing exports were likely due to inconsistent import styles across the application.
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';

interface CalendarViewProps {
    calendarEvents: CalendarEvent[];
    onEventSelect: (event: CalendarEvent) => void;
}

const getEventStyle = (type: CalendarEvent['type']) => {
    switch(type) {
        case 'assignment': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700';
        case 'test': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300 dark:border-orange-700';
        case 'quiz': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
};

const MonthView: React.FC<{
    currentDate: Date;
    eventsByDate: Record<string, CalendarEvent[]>;
    onEventSelect: (event: CalendarEvent) => void;
}> = ({ currentDate, eventsByDate, onEventSelect }) => {
    const firstDayOfMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);
    const lastDayOfMonth = useMemo(() => endOfMonth(currentDate), [currentDate]);

    const daysInMonth = useMemo(() => eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth),
        end: endOfWeek(lastDayOfMonth)
    }), [firstDayOfMonth, lastDayOfMonth]);
    
    return (
        <div className="grid grid-cols-7 grid-rows-6 flex-1 -mx-px -my-px">
            {daysInMonth.map(day => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const dayEvents = eventsByDate[format(day, 'yyyy-MM-dd')] || [];

                return (
                    <div key={day.toString()} className={`p-2 border border-gray-200 dark:border-gray-700 flex flex-col transition-colors ${isCurrentMonth ? '' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                       <time dateTime={format(day, 'yyyy-MM-dd')} className={`h-6 w-6 flex items-center justify-center rounded-full text-sm font-semibold mb-1 ${isCurrentDay ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                            {format(day, 'd')}
                       </time>
                       <div className="flex-1 overflow-y-auto space-y-1">
                            {dayEvents.map(event => (
                                <button 
                                    key={event.id}
                                    onClick={() => onEventSelect(event)}
                                    className={`w-full text-left text-xs p-1.5 rounded-md truncate transition-transform hover:scale-105 border-l-4 ${getEventStyle(event.type)}`}
                                    title={event.title}
                                >
                                    <span className="font-semibold">{event.title}</span>
                                </button>
                            ))}
                       </div>
                    </div>
                );
            })}
        </div>
    );
};

const WeekView: React.FC<{
    currentDate: Date;
    eventsByDate: Record<string, CalendarEvent[]>;
    onEventSelect: (event: CalendarEvent) => void;
}> = ({ currentDate, eventsByDate, onEventSelect }) => {
    const days = useMemo(() => eachDayOfInterval({
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate)
    }), [currentDate]);

    return (
        <div className="grid grid-cols-7 flex-1 -mx-px">
            {days.map(day => {
                const dayEvents = eventsByDate[format(day, 'yyyy-MM-dd')] || [];
                const isCurrentDay = isToday(day);

                return (
                    <div key={day.toISOString()} className="border-r border-gray-200 dark:border-gray-700 px-2 flex flex-col">
                        <div className={`text-center py-2 ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</p>
                            <p className={`text-2xl font-bold ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{format(day, 'd')}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 py-2">
                             {dayEvents.length > 0 ? dayEvents.map(event => (
                                <button 
                                    key={event.id}
                                    onClick={() => onEventSelect(event)}
                                    className={`w-full text-left p-2 rounded-lg transition-shadow hover:shadow-md border-l-4 ${getEventStyle(event.type)}`}
                                >
                                    <p className="font-semibold text-sm">{event.title}</p>
                                    <p className="text-xs opacity-80">{event.courseName}</p>
                                </button>
                             )) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                                    No events
                                </div>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ calendarEvents, onEventSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('month');

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const eventsByDate = useMemo(() => {
        return calendarEvents.reduce((acc, event) => {
            const dateKey = format(event.date, 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(event);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);
    }, [calendarEvents]);

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addWeeks(currentDate, 1));
    };

    const headerTitle = useMemo(() => {
        if (view === 'month') {
            return format(currentDate, 'MMMM yyyy');
        }
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        if (isSameMonth(start, end)) {
            return format(currentDate, 'MMMM yyyy');
        }
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }, [currentDate, view]);
    
    return (
        <div className="animate-fade-in bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{headerTitle}</h1>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center">
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded ${view === 'month' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Month</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded ${view === 'week' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Week</button>
                    </div>
                    <div className="flex items-center">
                        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Previous period">
                            <ChevronLeftIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-sm font-semibold rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                            Today
                        </button>
                        <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Next period">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {view === 'month' && (
                     <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                        {weekDays.map(day => <div key={day}>{day}</div>)}
                    </div>
                )}
                
                {view === 'month' ? (
                    <MonthView currentDate={currentDate} eventsByDate={eventsByDate} onEventSelect={onEventSelect} />
                ) : (
                    <WeekView currentDate={currentDate} eventsByDate={eventsByDate} onEventSelect={onEventSelect} />
                )}
            </div>
        </div>
    );
};

export default CalendarView;