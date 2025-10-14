// Fix: Add a triple-slash directive to include TypeScript type definitions for the Chrome Extension APIs.
/// <reference types="chrome" />

import React, { useState, useMemo, useEffect } from 'react';
import { Course, Assignment, AiTutorMessage, Settings } from '../types';
import { format } from 'date-fns';
import { estimateAssignmentTime, getAssignmentHelp, generateNotes, createTutorChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { SparklesIcon, XIcon, ClockIcon, DocumentTextIcon, QuestionMarkCircleIcon, NoteIcon, ExternalLinkIcon } from './icons/Icons';

const AiTutorModal: React.FC<{ assignment: Assignment; onClose: () => void; }> = ({ assignment, onClose }) => {
    const [messages, setMessages] = useState<AiTutorMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const chat = useMemo(() => createTutorChat(assignment), [assignment]);
    
    useEffect(() => {
        if (!chat) {
            setMessages([{ role: 'model', text: 'Failed to initialize AI Tutor. The Gemini API key may be missing or invalid in your deployment settings.' }]);
        }
    }, [chat]);

    const sendMessage = async () => {
        if (!chat) {
            setInputError("AI Tutor is not available.");
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
            console.error("AI Tutor Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">AI Tutor: {assignment.title}</h2>
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
                        placeholder={!chat ? "AI Tutor not available" : "Ask for help..."}
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


const AssignmentCard: React.FC<{ assignment: Assignment; onTutorClick: (assignment: Assignment) => void }> = ({ assignment, onTutorClick }) => {
    const [aiResponse, setAiResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAiResponseVisible, setIsAiResponseVisible] = useState(false);
    const [aiActionType, setAiActionType] = useState<'help' | 'notes' | null>(null);
    const [estimatedTime, setEstimatedTime] = useState('');
    const [isEstimatingTime, setIsEstimatingTime] = useState(false);
    const [canvasLink, setCanvasLink] = useState<string | null>(null);

    useEffect(() => {
        const SETTINGS_KEY = 'canvasAiAssistantSettings';
        const loadSettings = async () => {
            try {
                if (typeof chrome !== "undefined" && chrome.storage) {
                    const data = await chrome.storage.local.get(SETTINGS_KEY);
                    if (data[SETTINGS_KEY]) {
                        const settings: Settings = data[SETTINGS_KEY];
                        if (settings.canvasUrl && assignment.courseId && assignment.id) {
                            setCanvasLink(`${settings.canvasUrl}/courses/${assignment.courseId}/assignments/${assignment.id}`);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to parse settings for canvas link", error);
            }
        };
        loadSettings();
    }, [assignment.courseId, assignment.id]);

    const handleEstimateTime = async () => {
        setIsEstimatingTime(true);
        const time = await estimateAssignmentTime(assignment);
        setEstimatedTime(time);
        setIsEstimatingTime(false);
    };

    const handleAiAction = async (action: 'help' | 'notes') => {
        if (isAiResponseVisible && aiActionType === action) {
            setIsAiResponseVisible(false);
            return;
        }

        setIsLoading(true);
        setAiResponse('');
        setAiActionType(action);
        setIsAiResponseVisible(true);
        let response = '';
        switch(action) {
            case 'help':
                response = await getAssignmentHelp(assignment);
                break;
            case 'notes':
                response = await generateNotes(assignment);
                break;
        }
        setAiResponse(response);
        setIsLoading(false);
    }

    return (
      <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-[1.04] hover:border-blue-500">
          <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-white">{assignment.title}</h3>
                <p className="text-sm text-gray-400">Due: {format(assignment.dueDate, 'PPp')}</p>
                 <div className="text-sm text-gray-400 mt-1 flex items-center h-5">
                  {(isEstimatingTime || estimatedTime) && <ClockIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />}
                  {isEstimatingTime ? (
                    <span className="animate-pulse">Estimating time...</span>
                  ) : estimatedTime.startsWith('[AI Error]') ? (
                    <span className="text-red-400">{estimatedTime.replace('[AI Error]', '').trim()}</span>
                  ) : estimatedTime ? (
                    <span>Est. Time: {estimatedTime}</span>
                  ) : null}
                </div>
              </div>
              {canvasLink && (
                  <a 
                    href={canvasLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors border border-gray-700 hover:border-blue-500/50 bg-gray-900/50 hover:bg-gray-800 px-2.5 py-1.5 rounded-md"
                    aria-label="View on Canvas"
                  >
                     <ExternalLinkIcon className="w-4 h-4" />
                     View on Canvas
                  </a>
              )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400" />
                    Assignment Details
                </h4>
                <span className="text-sm font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{assignment.points} points</span>
            </div>
            <div 
                className="prose prose-sm prose-invert max-w-none text-gray-300 max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded-md border border-gray-700"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
            />
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={handleEstimateTime} className="btn-ai" disabled={isEstimatingTime}>
                  <ClockIcon className="w-4 h-4" />
                  {isEstimatingTime ? 'Estimating...' : (estimatedTime ? 'Re-estimate' : 'Estimate Time')}
              </button>
              <button onClick={() => handleAiAction('help')} className="btn-ai">
                  <QuestionMarkCircleIcon className="w-4 h-4" />
                  Get Help
              </button>
              <button onClick={() => handleAiAction('notes')} className="btn-ai">
                  <NoteIcon className="w-4 h-4" />
                  Generate Notes
              </button>
              <button onClick={() => onTutorClick(assignment)} className="btn-ai-primary">
                  <SparklesIcon className="w-4 h-4" />
                  AI Tutor
              </button>
          </div>
          
          <div className={`transition-all duration-300 ease-in-out grid ${isAiResponseVisible ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-white capitalize flex items-center">
                          <SparklesIcon className="w-4 h-4 mr-2 text-blue-400"/>
                          AI Generated {aiActionType}
                      </h4>
                      <button 
                          onClick={() => setIsAiResponseVisible(false)} 
                          className="text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                          aria-label="Close AI response"
                      >
                          <XIcon className="w-5 h-5" />
                      </button>
                  </div>
                  {isLoading ? (
                      <div className="flex items-center text-sm text-gray-400">
                        <div className="w-5 h-5 mr-2 border-2 border-blue-400 border-dashed rounded-full animate-spin"></div>
                        Generating...
                      </div>
                  ) : aiResponse.startsWith('[AI Error]') ? (
                     <div className="text-sm text-red-400 whitespace-pre-wrap">{aiResponse.replace('[AI Error]', '').trim()}</div>
                  ) : (
                     <div className="text-sm text-gray-300 whitespace-pre-wrap prose prose-sm prose-invert max-w-none">{aiResponse}</div>
                  )}
                </div>
              </div>
          </div>
      </div>
    );
};

const CoursesView: React.FC<{ courses: Course[]; assignments: Assignment[] }> = ({ courses, assignments }) => {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [tutoringAssignment, setTutoringAssignment] = useState<Assignment | null>(null);

    useEffect(() => {
        // If courses are loaded and either no course is selected OR the selected course is no longer in the list,
        // default to the first course in the new list. This makes the UI more stable.
        if (courses.length > 0 && (!selectedCourse || !courses.some(c => c.id === selectedCourse.id))) {
            setSelectedCourse(courses[0]);
        } else if (courses.length === 0) {
            // If the courses list becomes empty (e.g., due to a filter), clear the selection.
            setSelectedCourse(null);
        }
    }, [courses, selectedCourse]);

    const filteredAssignments = assignments.filter(a => a.courseId === selectedCourse?.id);

    return (
        <div className="animate-fade-in">
            <style>{`
                .btn-ai { @apply bg-gray-700 text-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-gray-600 flex items-center gap-1.5; }
                .btn-ai-primary { @apply bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-blue-600 flex items-center gap-1.5; }
                @keyframes shake {
                  10%, 90% { transform: translate3d(-1px, 0, 0); }
                  20%, 80% { transform: translate3d(2px, 0, 0); }
                  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                  40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake {
                  animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
            <h1 className="text-3xl font-bold text-white mb-6">Courses & Assignments</h1>
            <div className="flex space-x-2 mb-6 border-b border-gray-700">
                {courses.map(course => (
                    <button 
                        key={course.id} 
                        onClick={() => setSelectedCourse(course)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedCourse?.id === course.id ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        {course.courseCode}
                    </button>
                ))}
            </div>

            {selectedCourse && (
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">{selectedCourse.name}</h2>
                    <div className="space-y-6">
                        {filteredAssignments.length > 0 ? (
                           filteredAssignments.map(assignment => (
                               <AssignmentCard key={assignment.id} assignment={assignment} onTutorClick={setTutoringAssignment} />
                           ))
                        ) : (
                           <div className="text-center py-10 bg-gray-800 rounded-lg">
                             <p className="text-gray-400">No assignments for this course.</p>
                           </div>
                        )}
                    </div>
                </div>
            )}
            
            {tutoringAssignment && (
              <AiTutorModal assignment={tutoringAssignment} onClose={() => setTutoringAssignment(null)} />
            )}
        </div>
    );
};

export default CoursesView;