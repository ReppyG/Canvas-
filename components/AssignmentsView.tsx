import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Course, Assignment, AiTutorMessage, Settings, AssignmentStatus } from '../types';
import { format } from 'date-fns';
import { estimateAssignmentTime, createTutorChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { SparklesIcon, XIcon, ClockIcon, DocumentTextIcon, ExternalLinkIcon } from './icons/Icons';
import { storage } from '../services/storageService';
import StudyPlanDialog from './StudyPlanDialog';

const AiTutorModal: React.FC<{ assignment: Assignment; onClose: () => void; }> = ({ assignment, onClose }) => {
    const [messages, setMessages] = useState<AiTutorMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const chat = useMemo(() => {
        try {
            return createTutorChat(assignment);
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [assignment]);
    
    useEffect(() => {
        if (!chat) {
            setMessages([{ role: 'model', text: 'Failed to initialize AI Tutor. The Gemini API key may be missing or invalid.' }]);
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
            const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error."
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Tutor: {assignment.name}</h2>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><XIcon/></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
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
                        placeholder={!chat ? "AI Tutor not available" : "Ask for help..."}
                        disabled={isLoading || !chat}
                        className={`flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 text-gray-900 dark:text-gray-200 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${inputError ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'} ${isShaking ? 'animate-shake' : ''}`}
                    />
                    <button onClick={sendMessage} disabled={isLoading || !chat} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400">Send</button>
                </div>
                {inputError && <p className="text-red-500 text-xs mt-1 ml-1">{inputError}</p>}
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
    settings: Settings | null;
}> = ({ assignment, course, onTutorClick, onPlanClick, onStatusChange, settings }) => {
    const [estimatedTime, setEstimatedTime] = useState('');
    const [isEstimatingTime, setIsEstimatingTime] = useState(false);
    const [canvasLink, setCanvasLink] = useState<string | null>(null);

    useEffect(() => {
        if (settings?.canvasUrl && assignment.course_id && assignment.id) {
            // The URL from settings is already correctly formatted.
            setCanvasLink(`${settings.canvasUrl}/courses/${assignment.course_id}/assignments/${assignment.id}`);
        } else {
            setCanvasLink(null);
        }
    }, [settings, assignment.course_id, assignment.id]);

    const handleEstimateTime = useCallback(async (forceRefresh = false) => {
        setIsEstimatingTime(true);
        
        if (!forceRefresh) {
            const cachedEstimates = await getEstimatesFromStorage();
            if (cachedEstimates[assignment.id]) {
                setEstimatedTime(cachedEstimates[assignment.id]);
                setIsEstimatingTime(false);
                return;
            }
        }

        try {
            const time = await estimateAssignmentTime(assignment);
            setEstimatedTime(time);
            await saveEstimateToStorage(assignment.id, time);
        } catch (e: any) {
            setEstimatedTime(e.message || '[AI Error] Failed to estimate.');
        } finally {
            setIsEstimatingTime(false);
        }
    }, [assignment]);

    useEffect(() => {
        handleEstimateTime();
    }, [handleEstimateTime]);

    return (
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-blue-500/50">
          <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{assignment.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.course_code}: {format(new Date(assignment.due_at!), 'PPp')}</p>
                 <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center h-5">
                  {(isEstimatingTime || estimatedTime) && <ClockIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />}
                  {isEstimatingTime ? (
                    <span className="animate-pulse">Estimating time...</span>
                  ) : estimatedTime.startsWith('[AI Error]') ? (
                    <span className="text-red-500">{estimatedTime.replace('[AI Error]', '').trim()}</span>
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
                    className="flex-shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-300 dark:border-gray-600 hover:border-blue-500/50 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 px-2.5 py-1.5 rounded-md"
                    aria-label="View on Canvas"
                  >
                     <ExternalLinkIcon className="w-4 h-4" />
                     View
                  </a>
              )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Assignment Details
                </h4>
                <span className="text-sm font-semibold text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">{assignment.points_possible} points</span>
            </div>
            <div 
                className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 dark:prose-invert max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md border border-gray-200 dark:border-gray-600"
                dangerouslySetInnerHTML={{ __html: assignment.description || '<p>No description provided.</p>' }}
            />
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
            <select
                value={assignment.status}
                onChange={(e) => onStatusChange(assignment.id, e.target.value as AssignmentStatus)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

interface AssignmentsViewProps {
  courses: Course[];
  assignments: Assignment[];
  onStatusChange: (assignmentId: number, status: AssignmentStatus) => void;
  initialCourseId: string | null;
  onNavigated: () => void;
  highlightedAssignmentId: number | null;
  onHighlightDone: () => void;
  settings: Settings | null;
}

const AssignmentsView: React.FC<AssignmentsViewProps> = ({ courses, assignments, onStatusChange, initialCourseId, onNavigated, highlightedAssignmentId, onHighlightDone, settings }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || 'all');
    const [tutoringAssignment, setTutoringAssignment] = useState<Assignment | null>(null);
    const [planningAssignment, setPlanningAssignment] = useState<Assignment | null>(null);
    const assignmentRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        // When the view is loaded with a one-time filter, apply it and then
        // immediately notify the parent to reset it.
        if (initialCourseId) {
            setSelectedCourseId(initialCourseId);
            onNavigated();
        }
    }, [initialCourseId, onNavigated]);

    const filteredAssignments = useMemo(() => {
        const sorted = [...assignments].sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
        if (selectedCourseId === 'all') {
            return sorted;
        }
        return sorted.filter(a => a.course_id.toString() === selectedCourseId);
    }, [selectedCourseId, assignments]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    const isHighlightedAssignmentVisible = useMemo(() => {
        if (!highlightedAssignmentId) return false;
        return filteredAssignments.some(a => a.id === highlightedAssignmentId);
    }, [filteredAssignments, highlightedAssignmentId]);

    useEffect(() => {
        if (highlightedAssignmentId && isHighlightedAssignmentVisible) {
            const element = assignmentRefs.current[highlightedAssignmentId];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-animation');
                const timer = setTimeout(() => {
                    if (assignmentRefs.current[highlightedAssignmentId]) {
                        assignmentRefs.current[highlightedAssignmentId]?.classList.remove('highlight-animation');
                    }
                    onHighlightDone();
                }, 2500); // Duration of animation
                return () => clearTimeout(timer);
            }
        } else if (highlightedAssignmentId) {
            // Assignment not visible in current filter, so we can't highlight. Reset.
            onHighlightDone();
        }
    }, [highlightedAssignmentId, isHighlightedAssignmentVisible, onHighlightDone]);


    return (
        <div className="animate-fade-in">
            <style>{`
                .btn-ai { @apply bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed; }
                .btn-ai-primary { @apply bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-blue-500 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed; }
                @keyframes shake {
                  10%, 90% { transform: translate3d(-1px, 0, 0); }
                  20%, 80% { transform: translate3d(2px, 0, 0); }
                  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                  40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                @keyframes highlight-fade {
                    from { background-color: rgba(59, 130, 246, 0.2); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4); }
                    to { background-color: transparent; box-shadow: 0 0 0 2px transparent; }
                }
                .highlight-animation {
                    animation: highlight-fade 2.5s ease-out;
                    border-radius: 0.5rem; /* Match card's border-radius */
                }
                .animate-shake {
                  animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignments</h1>
                <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                           <div
                                key={assignment.id}
                                ref={(el) => {
                                    assignmentRefs.current[assignment.id] = el;
                                }}
                           >
                               <AssignmentCard
                                   assignment={assignment} 
                                   course={course}
                                   onTutorClick={setTutoringAssignment} 
                                   onPlanClick={setPlanningAssignment}
                                   onStatusChange={onStatusChange}
                                   settings={settings}
                               />
                           </div>
                       )
                   })
                ) : (
                   <div className="text-center py-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                     <p className="text-gray-500 dark:text-gray-400">No assignments found for the selected filter.</p>
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