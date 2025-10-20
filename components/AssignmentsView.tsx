

import React, { useState, useMemo, useEffect } from 'react';
// Fix: Import missing types
import { Course, Assignment, AiTutorMessage, Settings, AssignmentStatus } from '../types';
import { format } from 'date-fns';
// Fix: Import missing functions
import { estimateAssignmentTime, createTutorChat } from '../services/geminiService';
import { Chat } from '@google/genai';
// Fix: Import missing icon
import { SparklesIcon, XIcon, ClockIcon, DocumentTextIcon, ExternalLinkIcon } from './icons/Icons';
import { storage } from '../services/storageService';
import StudyPlanDialog from './StudyPlanDialog';

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
        } else {
            setMessages([{ role: 'model', text: `Hello! I'm here to help you with your "${assignment.name}" assignment. Ask me anything to get started.` }]);
        }
    }, [chat, assignment.name]);

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
            const response = await chat.sendMessage({ message: input });
            const modelResponse: AiTutorMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelResponse]);

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
                <h2 className="text-lg font-bold text-white">AI Tutor: {assignment.name}</h2>
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

const ASSIGNMENT_ESTIMATES_KEY = 'canvasAiAssignmentEstimates';

const getEstimatesFromStorage = async (): Promise<Record<number, string>> => {
    const estimates = await storage.get<Record<number, string>>(ASSIGNMENT_ESTIMATES_KEY);
    return estimates || {};
};

const saveEstimateToStorage = async (assignmentId: number, estimate: string) => {
    const estimates = await getEstimatesFromStorage();
    estimates[assignmentId] = estimate;
    await storage.set(ASSIGNMENT_ESTIMATES_KEY, estimates);
};


const AssignmentCard: React.FC<{ 
    assignment: Assignment;
    course: Course;
    onTutorClick: (assignment: Assignment) => void;
    onPlanClick: (assignment: Assignment) => void;
    onStatusChange: (assignmentId: number, status: AssignmentStatus) => void;
}> = ({ assignment, course, onTutorClick, onPlanClick, onStatusChange }) => {
    const [estimatedTime, setEstimatedTime] = useState('');
    const [isEstimatingTime, setIsEstimatingTime] = useState(false);
    const [canvasLink, setCanvasLink] = useState<string | null>(null);

    useEffect(() => {
        const SETTINGS_KEY = 'canvasAiAssistantSettings';
        const loadSettings = async () => {
            const settings = await storage.get<Settings>(SETTINGS_KEY);
            // Fix: Use 'course_id' property
            if (settings?.canvasUrl && assignment.course_id && assignment.id) {
                setCanvasLink(`${settings.canvasUrl}/courses/${assignment.course_id}/assignments/${assignment.id}`);
            }
        };
        loadSettings();
    }, [assignment.course_id, assignment.id]);

    const handleEstimateTime = async (forceRefresh = false) => {
        setIsEstimatingTime(true);
        
        if (!forceRefresh) {
            const cachedEstimates = await getEstimatesFromStorage();
            if (cachedEstimates[assignment.id]) {
                setEstimatedTime(cachedEstimates[assignment.id]);
                setIsEstimatingTime(false);
                return;
            }
        }

        // Fix: Use try-catch block to handle API errors from geminiService
        try {
            const time = await estimateAssignmentTime(assignment);
            setEstimatedTime(time);
            await saveEstimateToStorage(assignment.id, time);
        } catch (e: any) {
            setEstimatedTime(e.message || '[AI Error] Failed to estimate.');
        } finally {
            setIsEstimatingTime(false);
        }
    };

    useEffect(() => {
        handleEstimateTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignment.id]);

    return (
      <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 hover:border-blue-500/50">
          <div className="flex justify-between items-start">
              <div>
                {/* Fix: use 'name' property */}
                <h3 className="font-bold text-lg text-white">{assignment.name}</h3>
                {/* Fix: use 'course_code' and 'due_at' properties */}
                <p className="text-sm text-gray-400">{course.course_code}: {format(new Date(assignment.due_at!), 'PPp')}</p>
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
                     View
                  </a>
              )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400" />
                    Assignment Details
                </h4>
                {/* Fix: Use 'points_possible' property */}
                <span className="text-sm font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{assignment.points_possible} points</span>
            </div>
            <div 
                className="prose prose-sm prose-invert max-w-none text-gray-300 max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded-md border border-gray-700"
                dangerouslySetInnerHTML={{ __html: assignment.description || '' }}
            />
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
            <select
                value={assignment.status}
                onChange={(e) => onStatusChange(assignment.id, e.target.value as AssignmentStatus)}
                className="bg-gray-700 text-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onPlanClick(assignment)} className="btn-ai">
                  <SparklesIcon className="w-4 h-4" />
                  Generate Study Plan
              </button>
              <button onClick={() => onTutorClick(assignment)} className="btn-ai-primary">
                  <SparklesIcon className="w-4 h-4" />
                  AI Tutor
              </button>
            </div>
          </div>
      </div>
    );
};

const AssignmentsView: React.FC<{ courses: Course[]; assignments: Assignment[] }> = ({ courses, assignments }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [tutoringAssignment, setTutoringAssignment] = useState<Assignment | null>(null);
    const [planningAssignment, setPlanningAssignment] = useState<Assignment | null>(null);
    const [assignmentStatuses, setAssignmentStatuses] = useState<Record<number, AssignmentStatus>>({});

    useEffect(() => {
        const initialStatuses = assignments.reduce((acc, a) => {
            acc[a.id] = a.status || 'NOT_STARTED';
            return acc;
        }, {} as Record<number, AssignmentStatus>);
        setAssignmentStatuses(initialStatuses);
    }, [assignments]);

    const handleStatusChange = (assignmentId: number, status: AssignmentStatus) => {
        setAssignmentStatuses(prev => ({...prev, [assignmentId]: status}));
        // Note: In a real app, this change would be persisted to a backend.
    };

    const filteredAssignments = useMemo(() => {
        const assignmentsWithStatus = assignments.map(a => ({ ...a, status: assignmentStatuses[a.id] || a.status || 'NOT_STARTED' }));

        const sorted = assignmentsWithStatus.sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

        if (selectedCourseId === 'all') {
            return sorted;
        }
        return sorted.filter(a => a.course_id.toString() === selectedCourseId);
    }, [selectedCourseId, assignments, assignmentStatuses]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    return (
        <div className="animate-fade-in">
            <style>{`
                .btn-ai { @apply bg-gray-700 text-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-gray-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed; }
                .btn-ai-primary { @apply bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed; }
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">Assignments</h1>
                <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id.toString()}>{course.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="space-y-6">
                {filteredAssignments.length > 0 ? (
                   filteredAssignments.map(assignment => {
                        const course = courseMap.get(assignment.course_id);
                        if (!course) return null;
                        return (
                           <AssignmentCard 
                               key={assignment.id} 
                               assignment={assignment} 
                               course={course}
                               onTutorClick={setTutoringAssignment} 
                               onPlanClick={setPlanningAssignment}
                               onStatusChange={handleStatusChange}
                           />
                       )
                   })
                ) : (
                   <div className="text-center py-20 bg-gray-800 rounded-lg">
                     <p className="text-gray-400">No assignments found for the selected filter.</p>
                   </div>
                )}
            </div>
            
            {tutoringAssignment && (
              <AiTutorModal assignment={tutoringAssignment} onClose={() => setTutoringAssignment(null)} />
            )}

            {planningAssignment && courseMap.get(planningAssignment.course_id) && (
              <StudyPlanDialog 
                assignment={planningAssignment}
                course={courseMap.get(planningAssignment.course_id)!}
                isOpen={!!planningAssignment}
                onClose={() => setPlanningAssignment(null)} 
              />
            )}
        </div>
    );
};

export default AssignmentsView;
