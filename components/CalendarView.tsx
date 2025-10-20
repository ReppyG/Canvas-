


import React, { useState } from 'react';
// Fix: Import missing CalendarEvent type
import { CalendarEvent, Course } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const CalendarView: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">&lt;</button>
      <h2 className="text-xl font-bold text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">&gt;</button>
    </div>
  );

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(startOfMonth(currentMonth));
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-semibold text-gray-400 text-sm" key={i}>
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 gap-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dailyEvents = events.filter(event => isSameDay(event.date, cloneDay));
        
        days.push(
          <div
            className={`p-2 h-32 border border-gray-800 rounded-md flex flex-col ${
              !isSameMonth(day, monthStart) ? 'bg-gray-800/50 text-gray-600' : 'bg-gray-800'
            }`}
            key={day.toString()}
          >
            <span className={`font-semibold ${isSameDay(day, new Date()) ? 'text-blue-400' : ''}`}>{formattedDate}</span>
            <div className="mt-1 space-y-1 overflow-y-auto text-xs">
                {dailyEvents.map(event => (
                    <div key={event.id} className={`p-1 rounded-sm text-white ${event.type === 'test' ? 'bg-red-500' : event.type === 'quiz' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                        {event.title}
                    </div>
                ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-2" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-2">{rows}</div>;
  };

  return (
    <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-6">Calendar</h1>
        <div className="bg-gray-900 p-4 rounded-lg">
            {renderHeader()}
            {renderDays()}
            <div className="mt-2">
                {renderCells()}
            </div>
        </div>
    </div>
  );
};

export default CalendarView;
