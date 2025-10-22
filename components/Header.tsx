import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SearchIcon, ExclamationTriangleIcon, FilterIcon, ClockIcon, SettingsIcon, LogOutIcon } from './icons/Icons';
import { Assignment, Course, AssignmentStatus, Page } from '../types';
import { format, isToday, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  assignments: Assignment[];
  courses: Course[];
  connectionStatus: 'live' | 'sample' | 'error';
  onAssignmentSelect: (assignment: Assignment) => void;
  onSetPage: (page: Page) => void;
}

type DateRange = 'all' | 'today' | 'this_week' | 'next_week';
const STATUSES: AssignmentStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

const UserProfile: React.FC<{ onSetPage: (page: Page) => void }> = ({ onSetPage }) => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={profileRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                    {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-32">{user.email}</p>
                </div>
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-50 py-1 animate-fade-in-fast">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                    </div>
                    <button onClick={() => { onSetPage(Page.Settings); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                        <SettingsIcon className="w-4 h-4" />
                        Settings
                    </button>
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center gap-2">
                        <LogOutIcon className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            )}
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ assignments, courses, connectionStatus, onAssignmentSelect, onSetPage }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<AssignmentStatus | 'all'>('all');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('all');
    const searchRef = useRef<HTMLDivElement>(null);

    // Close search popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredAssignments = useMemo(() => {
        const now = new Date();
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
        const startOfNextWeek = addWeeks(startOfThisWeek, 1);
        const endOfNextWeek = addWeeks(endOfThisWeek, 1);
        
        return assignments.filter(assignment => {
            // Filter by search term (name and description)
            const term = searchTerm.toLowerCase();
            const inTerm = term ? 
                (assignment.name.toLowerCase().includes(term) || assignment.description?.toLowerCase().includes(term)) 
                : true;

            // Filter by course
            const inCourse = selectedCourse === 'all' ? true : assignment.course_id.toString() === selectedCourse;

            // Filter by status
            const inStatus = selectedStatus === 'all' ? true : assignment.status === selectedStatus;

            // Filter by date range
            let inDateRange = true;
            if (assignment.due_at) {
                const dueDate = new Date(assignment.due_at);
                switch (selectedDateRange) {
                    case 'today':
                        inDateRange = isToday(dueDate);
                        break;
                    case 'this_week':
                        inDateRange = isWithinInterval(dueDate, { start: startOfThisWeek, end: endOfThisWeek });
                        break;
                    case 'next_week':
                        inDateRange = isWithinInterval(dueDate, { start: startOfNextWeek, end: endOfNextWeek });
                        break;
                    default: // 'all'
                        inDateRange = true;
                }
            } else if (selectedDateRange !== 'all') {
                inDateRange = false; // No due date, doesn't match specific range
            }

            return inTerm && inCourse && inStatus && inDateRange;
        });
    }, [searchTerm, selectedCourse, selectedStatus, selectedDateRange, assignments]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    return (
        <div className="flex-shrink-0">
            {connectionStatus === 'error' && (
                <div className="bg-red-100 text-red-800 text-center text-xs py-1.5 px-4 border-b border-red-200 flex items-center justify-center dark:bg-red-900/50 dark:text-red-300">
                    <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-2 flex-shrink-0" />
                    <span>Connection to Canvas failed. You are viewing sample data.</span>
                </div>
            )}
            <header className="h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
                <div className="flex-1 relative" ref={searchRef}>
                    <div 
                        className="w-full max-w-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-11 pr-4 text-gray-900 dark:text-gray-100 flex items-center cursor-text"
                        onClick={() => setIsSearchOpen(true)}
                    >
                         <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                         <span className="text-gray-500 dark:text-gray-400">Search and filter assignments...</span>
                    </div>

                    {isSearchOpen && (
                        <div className="absolute top-full mt-2 w-full max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-30 flex flex-col max-h-[70vh]">
                            {/* Search and Filter Inputs */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by keyword..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="filter-select">
                                        <option value="all">All Courses</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="filter-select">
                                        <option value="all">All Statuses</option>
                                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                    <select value={selectedDateRange} onChange={e => setSelectedDateRange(e.target.value as DateRange)} className="filter-select">
                                        <option value="all">Any Time</option>
                                        <option value="today">Due Today</option>
                                        <option value="this_week">Due This Week</option>
                                        <option value="next_week">Due Next Week</option>
                                    </select>
                                </div>
                            </div>
                            {/* Results */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredAssignments.length > 0 ? (
                                    <ul>
                                        {filteredAssignments.map(assignment => {
                                            const course = courseMap.get(assignment.course_id);
                                            return (
                                                <li key={assignment.id}>
                                                    <button
                                                      onClick={() => {
                                                        onAssignmentSelect(assignment);
                                                        setIsSearchOpen(false);
                                                      }}
                                                      className="w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    >
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">{assignment.name}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{course?.name || 'Unknown Course'}</p>
                                                        <div className="flex items-center justify-between mt-2 text-xs">
                                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                                <ClockIcon className="w-3.5 h-3.5" />
                                                                Due: {format(new Date(assignment.due_at!), 'PP')}
                                                            </span>
                                                            <span className={`px-2 py-0.5 font-medium rounded-full ${
                                                                assignment.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                                                assignment.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                                                            }`}>{assignment.status.replace('_', ' ')}</span>
                                                        </div>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                                        <FilterIcon className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p className="font-semibold">No assignments found</p>
                                        <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="ml-6">
                    <UserProfile onSetPage={onSetPage}/>
                </div>
            </header>
            <style>{`
                .filter-select { @apply w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500; }
                .animate-fade-in-fast { animation: fadeIn 0.2s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default Header;