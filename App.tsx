
import React, { useState, useEffect, useRef } from 'react';
import { Course, Assignment, StudyPlan, Summary, ChatMessage, View, CanvasConfig } from './types';
import { fetchCanvasData } from './services/canvasApiService';
import { generateStudyPlan as generateStudyPlanApi, generateSummary as generateSummaryApi, getTutorResponse } from './services/geminiService';
import { storage } from './services/storageService';
import { 
    BookOpenIcon, SparklesIcon, CalendarIcon, MessageCircleIcon, LayoutDashboardIcon, LogOutIcon, 
    MenuIcon, XIcon, ClockIcon, TrophyIcon, CheckCircle2Icon, CircleIcon, Loader2Icon, 
    SendIcon, DocumentTextIcon, BrainIcon, ChevronRightIcon, AlertCircleIcon, CheckIcon 
} from './components/icons/Icons';

const CANVAS_CONFIG_KEY = 'studentPlatformCanvasConfig';

// Main App Component
const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('setup');
    const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({ domain: '', accessToken: '' });
    const [courses, setCourses] = useState<Course[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [summaryContent, setSummaryContent] = useState('');
    const [summary, setSummary] = useState<Summary | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await storage.get<CanvasConfig>(CANVAS_CONFIG_KEY);
            if (savedConfig && savedConfig.domain && savedConfig.accessToken) {
                setCanvasConfig(savedConfig);
                await connectToCanvas(savedConfig);
            } else {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleSetError = (message: string, duration: number = 5000) => {
        setError(message);
        setTimeout(() => setError(''), duration);
    };

    const connectToCanvas = async (config: CanvasConfig) => {
        if (!config.domain || !config.accessToken) {
            handleSetError('Please provide both Canvas domain and access token');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { courses, assignments } = await fetchCanvasData(config.domain, config.accessToken);
            setCourses(courses);
            setAssignments(assignments);
            await storage.set(CANVAS_CONFIG_KEY, config);
            setCurrentView('dashboard');
        } catch (err: any) {
            handleSetError(err.message || 'Failed to connect to Canvas. Check credentials and domain.');
            setCurrentView('setup');
            await storage.remove(CANVAS_CONFIG_KEY); // Clear bad config
        } finally {
            setLoading(false);
        }
    };

    const generateStudyPlan = async (assignment: Assignment) => {
        setAiLoading(true);
        setSelectedAssignment(assignment);
        setStudyPlan(null);
        setCurrentView('planner');
        try {
            const plan = await generateStudyPlanApi(assignment);
            if(plan){
                setStudyPlan({
                    ...plan,
                    steps: plan.steps.map(s => ({ ...s, completed: false }))
                });
            } else {
                 throw new Error("The AI returned an empty study plan.");
            }
        } catch (err: any) {
            handleSetError(`Failed to generate study plan: ${err.message}`);
            setCurrentView('dashboard');
        } finally {
            setAiLoading(false);
        }
    };

    const generateSummary = async () => {
        if (!summaryContent.trim()) {
            handleSetError('Please enter some content to summarize');
            return;
        }
        setAiLoading(true);
        setError('');
        setSummary(null);
        try {
            const result = await generateSummaryApi(summaryContent);
            if (result) {
                setSummary(result);
            } else {
                throw new Error("The AI returned an empty summary.");
            }
        } catch (err: any) {
            handleSetError(`Failed to generate summary: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const sendTutorMessage = async () => {
        if (!chatInput.trim()) return;
        const userMessage: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date() };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setAiLoading(true);

        try {
            const responseContent = await getTutorResponse(chatMessages, userMessage.content);
            const aiMessage: ChatMessage = { role: 'assistant', content: responseContent, timestamp: new Date() };
            setChatMessages(prev => [...prev, aiMessage]);
        } catch (err: any) {
            handleSetError(`Failed to get response from tutor: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const handleDisconnect = () => {
        storage.remove(CANVAS_CONFIG_KEY);
        setCanvasConfig({ domain: '', accessToken: ''});
        setCourses([]);
        setAssignments([]);
        setCurrentView('setup');
    }

    if (loading && currentView === 'setup') {
         return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2Icon className="w-16 h-16 text-indigo-600 animate-spin" />
            </div>
        );
    }
    
    if (currentView === 'setup') {
        return <SetupView setConfig={setCanvasConfig} config={canvasConfig} onConnect={connectToCanvas} loading={loading} error={error} />;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar 
                isOpen={sidebarOpen} 
                coursesCount={courses.length}
                currentView={currentView}
                setCurrentView={setCurrentView}
                onDisconnect={handleDisconnect}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar 
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                    sidebarOpen={sidebarOpen} 
                    error={error} 
                    aiLoading={aiLoading && currentView === 'dashboard'} 
                />
                
                {currentView === 'dashboard' && <DashboardView assignments={assignments} courses={courses} onGeneratePlan={generateStudyPlan} aiLoading={aiLoading} />}
                {currentView === 'planner' && studyPlan && selectedAssignment && <PlannerView plan={studyPlan} setPlan={setStudyPlan} assignment={selectedAssignment} onBack={() => setCurrentView('dashboard')} />}
                {currentView === 'summarizer' && <SummarizerView summary={summary} setContent={setSummaryContent} content={summaryContent} onGenerate={generateSummary} aiLoading={aiLoading} />}
                {currentView === 'tutor' && <TutorView messages={chatMessages} setMessages={setChatMessages} input={chatInput} setInput={setChatInput} onSend={sendTutorMessage} aiLoading={aiLoading} />}
            </div>
        </div>
    );
};

const SetupView: React.FC<{config: CanvasConfig, setConfig: (c: CanvasConfig) => void, onConnect: (c: CanvasConfig) => void, loading: boolean, error: string}> = ({ config, setConfig, onConnect, loading, error }) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
                    <SparklesIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Platform</h1>
                <p className="text-gray-600">Connect your Canvas account to get started</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canvas Domain</label>
                    <input type="text" placeholder="yourschool.instructure.com" value={config.domain} onChange={(e) => setConfig({ ...config, domain: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canvas Access Token</label>
                    <input type="password" placeholder="Your Canvas API token" value={config.accessToken} onChange={(e) => setConfig({ ...config, accessToken: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    <p className="mt-2 text-xs text-gray-500">Get your token from: Account → Settings → New Access Token</p>
                </div>
                {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircleIcon className="w-4 h-4" />{error}</div>}
                <button onClick={() => onConnect(config)} disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? <><Loader2Icon className="w-5 h-5 animate-spin" /> Connecting...</> : <><SparklesIcon className="w-5 h-5" /> Connect to Canvas</>}
                </button>
            </div>
        </div>
    </div>
);

const Sidebar: React.FC<{isOpen: boolean, coursesCount: number, currentView: View, setCurrentView: (v: View) => void, onDisconnect: () => void}> = ({isOpen, coursesCount, currentView, setCurrentView, onDisconnect}) => (
    <div className={`${isOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center"><SparklesIcon className="w-6 h-6" /></div>
                <div>
                    <h2 className="font-bold text-lg">Student Platform</h2>
                    <p className="text-xs text-gray-400">{coursesCount} courses</p>
                </div>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><LayoutDashboardIcon className="w-5 h-5" /><span>Dashboard</span></button>
            <button onClick={() => setCurrentView('summarizer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'summarizer' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><DocumentTextIcon className="w-5 h-5" /><span>Summarizer</span></button>
            <button onClick={() => setCurrentView('tutor')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'tutor' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><MessageCircleIcon className="w-5 h-5" /><span>AI Tutor</span></button>
        </nav>
        <div className="p-4 border-t border-gray-800">
            <button onClick={onDisconnect} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"><LogOutIcon className="w-5 h-5" /><span>Disconnect</span></button>
        </div>
    </div>
);

const TopBar: React.FC<{onToggleSidebar: () => void, sidebarOpen: boolean, error: string, aiLoading: boolean}> = ({onToggleSidebar, sidebarOpen, error, aiLoading}) => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">{sidebarOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}</button>
        <div className="flex items-center gap-4">
            {error && <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircleIcon className="w-4 h-4" /><span>{error}</span></div>}
            {aiLoading && <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm"><Loader2Icon className="w-4 h-4 animate-spin" /><span>Generating with AI...</span></div>}
        </div>
    </div>
);

const DashboardView: React.FC<{assignments: Assignment[], courses: Course[], onGeneratePlan: (a: Assignment) => void, aiLoading: boolean}> = ({assignments, courses, onGeneratePlan, aiLoading}) => {
    const upcomingAssignments = assignments.filter(a => a.due_at && new Date(a.due_at) > new Date()).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()).slice(0, 10);
    return (
        <div className="flex-1 overflow-auto p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600 mb-8">Welcome back! Here's what's coming up.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><BookOpenIcon className="w-6 h-6 text-blue-600" /></div><h3 className="text-2xl font-bold text-gray-900">{courses.length}</h3><p className="text-gray-600 text-sm">Active Courses</p></div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4"><CalendarIcon className="w-6 h-6 text-purple-600" /></div><h3 className="text-2xl font-bold text-gray-900">{upcomingAssignments.length}</h3><p className="text-gray-600 text-sm">Upcoming Assignments</p></div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4"><SparklesIcon className="w-6 h-6 text-green-600" /></div><h3 className="text-2xl font-bold text-gray-900">AI Ready</h3><p className="text-gray-600 text-sm">Generate Study Plans</p></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-bold text-gray-900">Upcoming Assignments</h2></div>
                <div className="divide-y divide-gray-200">
                    {upcomingAssignments.length === 0 ? <div className="p-8 text-center text-gray-500"><CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p>No upcoming assignments found</p></div>
                        : upcomingAssignments.map(assignment => {
                            const daysUntilDue = assignment.due_at ? Math.ceil((new Date(assignment.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                            const urgencyColor = daysUntilDue <= 2 ? 'red' : daysUntilDue <= 7 ? 'yellow' : 'green';
                            return (<div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">{assignment.name}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor === 'red' ? 'bg-red-100 text-red-700' : urgencyColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">{assignment.courseName}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /><span>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'N/A'}</span></div>
                                            {assignment.points_possible && <div className="flex items-center gap-1"><TrophyIcon className="w-4 h-4" /><span>{assignment.points_possible} pts</span></div>}
                                        </div>
                                    </div>
                                    <button onClick={() => onGeneratePlan(assignment)} disabled={aiLoading} className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"><SparklesIcon className="w-4 h-4" />Generate Plan</button>
                                </div>
                            </div>);
                        })}
                </div>
            </div>
        </div>
    );
};

const PlannerView: React.FC<{plan: StudyPlan, setPlan: (p: StudyPlan) => void, assignment: Assignment, onBack: () => void}> = ({ plan, setPlan, assignment, onBack }) => {
    const toggleStep = (index: number) => {
        const newPlan = { ...plan, steps: plan.steps.map((step, i) => i === index ? { ...step, completed: !step.completed } : step) };
        setPlan(newPlan);
    };
    const completedSteps = plan.steps.filter(s => s.completed).length;
    const progress = (completedSteps / plan.steps.length) * 100;
    
    return (
        <div className="flex-1 overflow-auto p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"><ChevronRightIcon className="w-4 h-4 transform rotate-180" />Back to Dashboard</button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{plan.title}</h1>
            <p className="text-gray-600 mb-6">Estimated time: {plan.estimatedHours} hours • {assignment.courseName}</p>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-3"><span className="font-medium text-gray-900">Overall Progress</span><span className="text-sm text-gray-600">{completedSteps} / {plan.steps.length} steps</span></div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="space-y-4 mb-6">
                {plan.steps.map((step, index) => (
                    <div key={index} className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all ${step.completed ? 'border-green-200 opacity-75' : 'border-gray-200'}`}>
                        <div className="flex items-start gap-4">
                            <button onClick={() => toggleStep(index)} className="mt-1 flex-shrink-0">{step.completed ? <CheckCircle2Icon className="w-6 h-6 text-green-600" /> : <CircleIcon className="w-6 h-6 text-gray-400" />}</button>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`font-semibold ${step.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>Step {step.order}: {step.title}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${step.priority === 'high' ? 'bg-red-100 text-red-700' : step.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{step.priority}</span>
                                        <div className="flex items-center gap-1 text-sm text-gray-600"><ClockIcon className="w-4 h-4" /><span>{step.estimatedMinutes} min</span></div>
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-3">{step.description}</p>
                                {step.resources && step.resources.length > 0 && <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm font-medium text-gray-900 mb-2">Recommended Resources:</p><ul className="space-y-1">{step.resources.map((res, idx) => <li key={idx} className="text-sm text-gray-600">• {res}</li>)}</ul></div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SummarizerView: React.FC<{summary: Summary | null, content: string, setContent: (c: string) => void, onGenerate: () => void, aiLoading: boolean}> = ({ summary, content, setContent, onGenerate, aiLoading }) => (
    <div className="flex-1 overflow-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Lesson Summarizer</h1>
        <p className="text-gray-600 mb-8">Paste your lecture notes or reading materials to get a structured summary.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Content to Summarize</h2>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your content here..." className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
                <button onClick={onGenerate} disabled={aiLoading || !content.trim()} className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {aiLoading ? <><Loader2Icon className="w-5 h-5 animate-spin" /> Generating...</> : <><BrainIcon className="w-5 h-5" /> Generate Summary</>}
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                {!summary ? <div className="h-96 flex items-center justify-center text-gray-400"><div className="text-center"><DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Your summary will appear here</p></div></div>
                    : <div className="space-y-6 h-full overflow-y-auto">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">{summary.title}</h3>
                        <div><h4 className="font-semibold text-gray-900 mb-2">Main Topics</h4><div className="flex flex-wrap gap-2">{summary.mainTopics.map((topic, idx) => <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">{topic}</span>)}</div></div>
                        <div><h4 className="font-semibold text-gray-900 mb-3">Key Points</h4><div className="space-y-3">{summary.keyPoints.map((point, idx) => <div key={idx} className="border-l-4 border-indigo-500 pl-4"><div className="flex items-center gap-2 mb-1"><h5 className="font-medium text-gray-900">{point.concept}</h5><span className={`px-2 py-0.5 rounded text-xs font-medium ${point.importance === 'critical' ? 'bg-red-100 text-red-700' : point.importance === 'important' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{point.importance}</span></div><p className="text-sm text-gray-600">{point.explanation}</p></div>)}</div></div>
                    </div>}
            </div>
        </div>
    </div>
);

const TutorView: React.FC<{messages: ChatMessage[], setMessages: (m: ChatMessage[]) => void, input: string, setInput: (s: string) => void, onSend: () => void, aiLoading: boolean}> = ({ messages, setMessages, input, setInput, onSend, aiLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="p-6 border-b border-gray-200 bg-white"><h1 className="text-2xl font-bold text-gray-900 mb-1">AI Tutor</h1><p className="text-gray-600">Ask questions about any concept or topic.</p></div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {messages.length === 0 ? <div className="h-full flex items-center justify-center"><div className="text-center max-w-md"><div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4"><MessageCircleIcon className="w-8 h-8 text-indigo-600" /></div><h3 className="text-xl font-semibold text-gray-900 mb-2">Start a conversation</h3><p className="text-gray-600 mb-6">Ask me anything about your coursework. I'll help you understand concepts and work through problems.</p></div></div>
                    : <div className="max-w-3xl mx-auto space-y-4">{messages.map((message, idx) => <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}><p className="text-sm whitespace-pre-wrap">{message.content}</p><p className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>)}
                        {aiLoading && <div className="flex justify-start"><div className="bg-white rounded-2xl px-4 py-3 border border-gray-200"><div className="flex items-center gap-2"><Loader2Icon className="w-4 h-4 animate-spin text-indigo-600" /><span className="text-sm text-gray-600">Thinking...</span></div></div></div>}
                        <div ref={messagesEndRef} />
                    </div>}
            </div>
            <div className="p-6 bg-white border-t border-gray-200"><div className="max-w-3xl mx-auto"><div className="flex items-end gap-3"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder="Ask a question..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" rows={1} /><button onClick={onSend} disabled={aiLoading || !input.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><SendIcon className="w-5 h-5" /></button></div></div></div>
        </div>
    );
};

export default App;