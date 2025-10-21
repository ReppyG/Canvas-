import React, { useState, useEffect, useMemo } from 'react';
import { AiTutorMessage, Course, Assignment } from '../types';
import { createGlobalAssistantChat, generateGroundedText } from '../services/geminiService';
import { Chat } from '@google/genai';
import { SparklesIcon, XIcon, GlobeIcon, ExternalLinkIcon } from './icons/Icons';

interface GlobalAiChatProps {
    isOpen: boolean;
    onClose: () => void;
    courses: Course[];
    assignments: Assignment[];
}

const GlobalAiChat: React.FC<GlobalAiChatProps> = ({ isOpen, onClose, courses, assignments }) => {
    const [messages, setMessages] = useState<AiTutorMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [enableGrounding, setEnableGrounding] = useState(false);
    
    const context = useMemo(() => {
        const courseSummary = courses.map(c => ({ id: c.id, name: c.name, code: c.course_code }));
        const assignmentSummary = assignments.map(a => ({
            id: a.id,
            title: a.name,
            courseId: a.course_id,
            dueDate: a.due_at,
            points: a.points_possible
        }));
        return `CONTEXT:\nCourses: ${JSON.stringify(courseSummary)}\nAssignments: ${JSON.stringify(assignmentSummary)}`;
    }, [courses, assignments]);

    const chat = useMemo(() => {
        if (enableGrounding) return null; // Use one-shot calls for grounding
        try {
          return createGlobalAssistantChat(context);
        } catch(e) {
          console.error(e);
          return null;
        }
    }, [context, enableGrounding]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'model', text: "Hello! I'm your AI assistant. How can I help you today?" }]);
        }
    }, [isOpen, messages.length]);

    const sendMessage = async () => {
        if (!input.trim()) {
            setInputError("Message cannot be empty.");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
            return;
        }
        setInputError(null);

        const userMessage: AiTutorMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (enableGrounding) {
                 const history = messages.slice(1);
                 let fullPrompt = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n\n');
                 fullPrompt += `\n\nUser: ${currentInput}`;
                 const { text, sources } = await generateGroundedText(fullPrompt);
                 const modelResponse: AiTutorMessage = { role: 'model', text, sources };
                 setMessages(prev => [...prev, modelResponse]);
            } else {
                if (!chat) throw new Error("AI Assistant is not available.");
                const response = await chat.sendMessage({ message: currentInput });
                const modelResponse: AiTutorMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelResponse]);
            }
        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error.';
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500" /> AI Assistant</h2>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><XIcon/></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-500/20 dark:border-gray-600">
                                    <h4 className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">Sources:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((source, i) => (
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" key={i} title={source.uri}
                                                className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md transition-colors">
                                                <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-40">{source.title || new URL(source.uri).hostname}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg"><span className="animate-pulse">...</span></div></div>}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (inputError) setInputError(null);
                        }} 
                        onKeyPress={e => e.key === 'Enter' && sendMessage()} 
                        placeholder={!chat && !enableGrounding ? "AI Assistant not available" : "Ask anything..."}
                        disabled={isLoading || (!chat && !enableGrounding)}
                        className={`flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 text-gray-900 dark:text-gray-200 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${inputError ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'} ${isShaking ? 'animate-shake' : ''}`}
                    />
                    <button onClick={sendMessage} disabled={isLoading || (!chat && !enableGrounding)} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400">Send</button>
                </div>
                <div className="flex justify-between items-center mt-2">
                    {inputError && <p className="text-red-500 text-xs ml-1">{inputError}</p>}
                    <div className="flex-grow"></div>
                    <label htmlFor="global-grounding-toggle" className="flex items-center gap-2 cursor-pointer select-none">
                        <span className={`text-xs font-medium ${enableGrounding ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Search Web</span>
                        <div className="relative">
                            <input id="global-grounding-toggle" type="checkbox" className="sr-only" checked={enableGrounding} onChange={e => setEnableGrounding(e.target.checked)} />
                            <div className={`block w-10 h-5 rounded-full transition-colors ${enableGrounding ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${enableGrounding ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>
        </div>
      </div>
    );
};

export default GlobalAiChat;