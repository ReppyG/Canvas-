import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AiTutorMessage, Course, Assignment } from '../types';
import { createGlobalAssistantChat, generateGroundedText } from '../services/geminiService';
import { SparklesIcon, SendIcon, GlobeIcon, ExternalLinkIcon } from './icons/Icons';

interface ChatViewProps {
    courses: Course[];
    assignments: Assignment[];
}

const ChatView: React.FC<ChatViewProps> = ({ courses, assignments }) => {
    const [messages, setMessages] = useState<AiTutorMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [enableGrounding, setEnableGrounding] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const context = useMemo(() => {
        const courseSummary = courses.map(c => ({ id: c.id, name: c.name, code: c.course_code }));
        const assignmentSummary = assignments.map(a => ({
            id: a.id,
            title: a.name,
            courseId: a.course_id,
            dueDate: a.due_at,
            points: a.points_possible
        }));
        return JSON.stringify({ courses: courseSummary, assignments: assignmentSummary }, null, 2);
    }, [courses, assignments]);

    const chat = useMemo(() => {
        if (enableGrounding) return null; // Don't create a stateful chat session when grounding is enabled
        try {
          return createGlobalAssistantChat(context);
        } catch(e) {
          console.error(e);
          setChatError('Failed to initialize AI Assistant. The Gemini API key may be missing or invalid.');
          return null;
        }
    }, [context, enableGrounding]);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{ role: 'model', text: "Hello! I'm your AI assistant. How can I help you today? You can ask me about your assignments, or toggle 'Search Web' for up-to-date information." }]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: AiTutorMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);
        setChatError(null);

        try {
            if (enableGrounding) {
                const history = messages.slice(1); // Exclude initial welcome message
                let fullPrompt = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n\n');
                fullPrompt += `\n\nUser: ${currentInput}`;

                const { text, sources } = await generateGroundedText(fullPrompt);
                const modelResponse: AiTutorMessage = { role: 'model', text, sources };
                setMessages(prev => [...prev, modelResponse]);

            } else {
                if (!chat) {
                   throw new Error("Chat is not initialized. Please try again.");
                }
                const response = await chat.sendMessage({ message: currentInput });
                const modelResponse: AiTutorMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelResponse]);
            }
        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage = error instanceof Error ? `[AI Error] ${error.message}` : 'Sorry, I encountered an error.';
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <SparklesIcon className="w-8 h-8 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Assistant Chat</h1>
            </div>
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/></div>}
                            <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
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
                    {isLoading && (
                        <div className="flex items-end gap-3 justify-start">
                             <div className="flex-shrink-0 w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/></div>
                            <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center justify-center gap-1">
                                    <span className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                     {chatError && <p className="text-red-500 text-xs mb-2 text-center">{chatError}</p>}
                    <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
                            placeholder={chatError ? "AI Assistant not available" : "Ask anything about your courses..."}
                            disabled={isLoading || !!chatError}
                            className="flex-1 bg-transparent p-2 focus:outline-none text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:cursor-not-allowed"
                        />
                        <button 
                            onClick={handleSendMessage} 
                            disabled={isLoading || !!chatError || !input.trim()} 
                            className="bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-500 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send message"
                        >
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <label htmlFor="grounding-toggle" className="flex items-center gap-2 cursor-pointer select-none">
                            <span className={`text-xs font-medium ${enableGrounding ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Search Web</span>
                            <div className="relative">
                                <input id="grounding-toggle" type="checkbox" className="sr-only" checked={enableGrounding} onChange={e => setEnableGrounding(e.target.checked)} />
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

export default ChatView;