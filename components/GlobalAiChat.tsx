import React, { useState, useEffect, useMemo } from 'react';
import { AiTutorMessage, Course, Assignment } from '../types';
import { createGlobalAssistantChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { SparklesIcon, XIcon } from './icons/Icons';

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
    
    const context = useMemo(() => {
        // Create a concise summary of courses and assignments for the AI
        const courseSummary = courses.map(c => ({ id: c.id, name: c.name, code: c.courseCode }));
        const assignmentSummary = assignments.map(a => ({
            id: a.id,
            title: a.title,
            courseId: a.courseId,
            dueDate: a.dueDate.toISOString(),
            points: a.points
        }));
        return JSON.stringify({ courses: courseSummary, assignments: assignmentSummary }, null, 2);
    }, [courses, assignments]);

    const chat = useMemo(() => {
        return createGlobalAssistantChat(context);
    }, [context]);

    useEffect(() => {
        // Set initial message or error message when chat is created/failed
        if (chat && messages.length === 0) {
            setMessages([{ role: 'model', text: "Hello! I'm your Canvas AI assistant. How can I help you today? You can ask me about your assignments, due dates, or course details." }]);
        } else if (!chat && messages.length === 0) {
            setMessages([{ role: 'model', text: 'Failed to initialize AI Assistant. The Gemini API key may be missing or invalid in your deployment settings.' }]);
        }
    }, [chat, messages.length]);

    const sendMessage = async () => {
        if (!chat) {
            setInputError("AI Assistant is not available.");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
            return;
        }

        if (!input.trim()) {
            setInputError("Message cannot be empty.");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
            return;
        }
        setInputError(null);

        const userMessage: AiTutorMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const responseStream = await chat.sendMessageStream({ message: input });
            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            for await (const chunk of responseStream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = modelResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("AI Assistant Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-400" /> AI Assistant</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon/></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="p-3 bg-gray-700 rounded-lg"><span className="animate-pulse">...</span></div></div>}
            </div>
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (inputError) setInputError(null);
                        }} 
                        onKeyPress={e => e.key === 'Enter' && sendMessage()} 
                        placeholder={!chat ? "AI Assistant not available" : "Ask anything about your courses..."}
                        disabled={isLoading || !chat}
                        className={`flex-1 bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 text-white transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${inputError ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'} ${isShaking ? 'animate-shake' : ''}`}
                    />
                    <button onClick={sendMessage} disabled={isLoading || !chat} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-600">Send</button>
                </div>
                {inputError && <p className="text-red-400 text-xs mt-1 ml-1">{inputError}</p>}
            </div>
        </div>
      </div>
    );
};

export default GlobalAiChat;
