import React, { useState } from 'react';
import { generateText } from '../services/geminiService';
import { SearchIcon, SparklesIcon, ExclamationTriangleIcon } from './icons/Icons';
import { Course, Assignment } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';

interface HeaderProps {
  courses: Course[];
  assignments: Assignment[];
  connectionStatus: 'live' | 'sample' | 'error';
}

const answerWithCanvasData = (term: string, assignments: Assignment[]): string | null => {
    const lowerTerm = term.toLowerCase();

    // Check if the query is about a specific assignment
    for (const assignment of assignments) {
        const lowerTitle = assignment.title.toLowerCase();
        if (lowerTerm.includes(lowerTitle)) {
            if (lowerTerm.includes('due') || lowerTerm.includes('when')) {
                return `The due date for "${assignment.title}" is ${format(assignment.dueDate, 'PPp')}.`;
            }
            if (lowerTerm.includes('about') || lowerTerm.includes('description')) {
                return `Here is the description for "${assignment.title}":\n\n${assignment.description}`;
            }
            if (lowerTerm.includes('points')) {
                return `The assignment "${assignment.title}" is worth ${assignment.points} points.`;
            }
            return `Found details for "${assignment.title}":\n- Due Date: ${format(assignment.dueDate, 'PPp')}\n- Points: ${assignment.points}`;
        }
    }

    // Check for general questions about due dates
    if (lowerTerm.includes('what is due')) {
        const dueAssignments = assignments.filter(a => isToday(a.dueDate) || isTomorrow(a.dueDate));
        if (dueAssignments.length > 0) {
            let response = "Here are your upcoming deadlines:\n";
            response += dueAssignments.map(a => `- "${a.title}" is due ${isToday(a.dueDate) ? 'today' : 'tomorrow'} at ${format(a.dueDate, 'p')}.`).join('\n');
            return response;
        } else {
            return "You have no assignments due today or tomorrow. Great job!";
        }
    }

    return null; // No specific answer found in local data
};

const Header: React.FC<HeaderProps> = ({ courses, assignments, connectionStatus }) => {
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
            const result = await generateText(`Answer the following question: ${searchTerm}`);
            setSearchResult(result);
            setIsSearching(false);
        }
    };

    return (
        <div className="flex-shrink-0">
            {connectionStatus === 'sample' && (
                <div className="bg-yellow-600/50 text-yellow-200 text-center text-xs py-1.5 px-4 border-b border-yellow-700/50 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-2 flex-shrink-0" />
                    <span>Viewing sample data. Live connection failed due to browser security (CORS).</span>
                </div>
            )}
            <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center px-8">
                <div className="flex-1 relative">
                    <form onSubmit={handleSearch}>
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Ask about your assignments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </form>

                    {showResult && (
                        <div className="absolute top-full mt-2 w-full max-w-lg bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 p-4">
                            <div className="flex justify-between items-center mb-2">
                               <h3 className="font-semibold text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-400"/> AI Response</h3>
                               <button onClick={() => setShowResult(false)} className="text-gray-400 hover:text-white">&times;</button>
                            </div>
                            {isSearching ? (
                                <div className="flex items-center justify-center p-4">
                                   <div className="w-8 h-8 border-2 border-blue-400 border-dashed rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{searchResult}</p>
                            )}
                        </div>
                    )}
                </div>
            </header>
        </div>
    );
};

export default Header;