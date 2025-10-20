

import React, { useState } from 'react';
// Fix: Import missing generateText function
import { generateText } from '../services/geminiService';
// Fix: Import missing icons
import { SearchIcon, SparklesIcon, ExclamationTriangleIcon } from './icons/Icons';
import { Assignment } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';

interface HeaderProps {
  assignments: Assignment[];
  connectionStatus: 'live' | 'sample' | 'error';
}

const answerWithCanvasData = (term: string, assignments: Assignment[]): string | null => {
    const lowerTerm = term.toLowerCase();

    // Check if the query is about a specific assignment
    for (const assignment of assignments) {
        // Fix: Use 'name' property instead of 'title'
        const lowerTitle = assignment.name.toLowerCase();
        if (lowerTerm.includes(lowerTitle)) {
            if (lowerTerm.includes('due') || lowerTerm.includes('when')) {
                // Fix: Use 'due_at' property and parse it
                return `The due date for "${assignment.name}" is ${format(new Date(assignment.due_at!), 'PPp')}.`;
            }
            if (lowerTerm.includes('about') || lowerTerm.includes('description')) {
                return `Here is the description for "${assignment.name}":\n\n${assignment.description}`;
            }
            if (lowerTerm.includes('points')) {
                // Fix: Use 'points_possible' property
                return `The assignment "${assignment.name}" is worth ${assignment.points_possible} points.`;
            }
            // Fix: Use correct properties
            return `Found details for "${assignment.name}":\n- Due Date: ${format(new Date(assignment.due_at!), 'PPp')}\n- Points: ${assignment.points_possible}`;
        }
    }

    // Check for general questions about due dates
    if (lowerTerm.includes('what is due')) {
        // Fix: Use 'due_at' and parse it
        const dueAssignments = assignments.filter(a => a.due_at && (isToday(new Date(a.due_at)) || isTomorrow(new Date(a.due_at))));
        if (dueAssignments.length > 0) {
            let response = "Here are your upcoming deadlines:\n";
            // Fix: Use correct properties and parse date
            response += dueAssignments.map(a => `- "${a.name}" is due ${isToday(new Date(a.due_at!)) ? 'today' : 'tomorrow'} at ${format(new Date(a.due_at!), 'p')}.`).join('\n');
            return response;
        } else {
            return "You have no assignments due today or tomorrow. Great job!";
        }
    }

    return null; // No specific answer found in local data
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
                const result = await generateText(`Answer the following question: ${searchTerm}`);
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
            {connectionStatus === 'sample' && (
                <div className="bg-yellow-600/50 text-yellow-200 text-center text-xs py-1.5 px-4 border-b border-yellow-700/50 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-2 flex-shrink-0" />
                    <span>Viewing sample data. Could not establish a live connection to Canvas.</span>
                </div>
            )}
            <header className="h-20 bg-slate-900 border-b border-gray-800 flex items-center px-8">
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
