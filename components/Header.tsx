import React, { useState } from 'react';
import { generateText } from '../services/geminiService';
import { SearchIcon, SparklesIcon, ExclamationTriangleIcon } from './icons/Icons';
import { Assignment } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';

interface HeaderProps {
  assignments: Assignment[];
  connectionStatus: 'live' | 'sample' | 'error';
}

const answerWithCanvasData = (term: string, assignments: Assignment[]): string | null => {
    const lowerTerm = term.toLowerCase();

    for (const assignment of assignments) {
        const lowerTitle = assignment.name.toLowerCase();
        if (lowerTerm.includes(lowerTitle)) {
            if (lowerTerm.includes('due') || lowerTerm.includes('when')) {
                return `The due date for "${assignment.name}" is ${format(new Date(assignment.due_at!), 'PPp')}.`;
            }
            if (lowerTerm.includes('about') || lowerTerm.includes('description')) {
                return `Here is the description for "${assignment.name}":\n\n${assignment.description}`;
            }
            if (lowerTerm.includes('points')) {
                return `The assignment "${assignment.name}" is worth ${assignment.points_possible} points.`;
            }
            return `Found details for "${assignment.name}":\n- Due Date: ${format(new Date(assignment.due_at!), 'PPp')}\n- Points: ${assignment.points_possible}`;
        }
    }

    if (lowerTerm.includes('what is due')) {
        const dueAssignments = assignments.filter(a => a.due_at && (isToday(new Date(a.due_at)) || isTomorrow(new Date(a.due_at))));
        if (dueAssignments.length > 0) {
            let response = "Here are your upcoming deadlines:\n";
            response += dueAssignments.map(a => `- "${a.name}" is due ${isToday(new Date(a.due_at!)) ? 'today' : 'tomorrow'} at ${format(new Date(a.due_at!), 'p')}.`).join('\n');
            return response;
        } else {
            return "You have no assignments due today or tomorrow. Great job!";
        }
    }

    return null;
};

const Header: React.FC<HeaderProps> = ({ assignments, connectionStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState('');
    const [showResult, setShowResult] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        setShowResult(true);
        setSearchResult('');
        
        const canvasAnswer = answerWithCanvasData(searchTerm, assignments);

        if (canvasAnswer) {
            setSearchResult(canvasAnswer);
            setIsSearching(false);
        } else {
            try {
                const result = await generateText(`Answer the following question about a student's coursework: ${searchTerm}`);
                setSearchResult(result);
            } catch (err: any) {
                setSearchResult(err.message || 'Failed to get AI response.');
            } finally {
                setIsSearching(false);
            }
        }
    };

    return (
        <div className="flex-shrink-0">
            {connectionStatus === 'error' && (
                <div className="bg-red-100 text-red-800 text-center text-xs py-1.5 px-4 border-b border-red-200 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-2 flex-shrink-0" />
                    <span>Connection to Canvas failed. You are viewing sample data.</span>
                </div>
            )}
            <header className="h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-8">
                <div className="flex-1 relative">
                    <form onSubmit={handleSearch}>
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Ask about your assignments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full max-w-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-11 pr-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </form>

                    {showResult && (
                        <div className="absolute top-full mt-2 w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 p-4">
                            <div className="flex justify-between items-center mb-2">
                               <h3 className="font-semibold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Response</h3>
                               <button onClick={() => setShowResult(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                            </div>
                            {isSearching ? (
                                <div className="flex items-center justify-center p-4">
                                   <div className="w-8 h-8 border-2 border-blue-500 border-dashed rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{searchResult}</p>
                            )}
                        </div>
                    )}
                </div>
            </header>
        </div>
    );
};

export default Header;