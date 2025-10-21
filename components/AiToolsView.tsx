import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Assignment, Course, AiTutorMessage } from '../types';
import { SparklesIcon, DocumentTextIcon, BrainIcon, ImageIcon, MicIcon, VideoIcon, SendIcon, GlobeIcon, ExternalLinkIcon, XIcon, MessageCircleIcon, PaintBrushIcon, Wand2Icon, VolumeUpIcon, PhoneIcon, MapIcon } from './icons/Icons';
import { generateNotesFromText, summarizeDocument, createGlobalAssistantChat, generateGroundedText } from '../services/geminiService';
import ImageAnalyzerModal from './ImageAnalyzerModal';
import AudioTranscriberModal from './AudioTranscriberModal';
import VideoAnalyzerModal from './VideoAnalyzerModal';
import ImageGeneratorModal from './ImageGeneratorModal';
import VideoGeneratorModal from './VideoGeneratorModal';
import ImageEditorModal from './ImageEditorModal';
import TtsModal from './TtsModal';
import LiveConversationModal from './LiveConversationModal';

// --- AI Assistant Modal (previously ChatView.tsx) ---
interface AiAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    courses: Course[];
    assignments: Assignment[];
}

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose, courses, assignments }) => {
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
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

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
        if (enableGrounding) return null;
        try {
            return createGlobalAssistantChat(context);
        } catch (e) {
            console.error(e);
            setChatError('Failed to initialize AI Assistant. The Gemini API key may be missing or invalid.');
            return null;
        }
    }, [context, enableGrounding]);
    
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'model', text: "Hello! I'm your AI assistant. How can I help you today? You can ask me about your assignments, or toggle 'Search Web' for up-to-date information." }]);
        }
    }, [isOpen, messages.length]);

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
                const history = messages.slice(1);
                let fullPrompt = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n\n');
                fullPrompt += `\n\nUser: ${currentInput}`;

                const { text, sources } = await generateGroundedText(fullPrompt);
                const modelResponse: AiTutorMessage = { role: 'model', text, sources };
                setMessages(prev => [...prev, modelResponse]);
            } else {
                if (!chat) throw new Error("Chat is not initialized.");
                const response = await chat.sendMessage({ message: currentInput });
                const modelResponse: AiTutorMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelResponse]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? `[AI Error] ${error.message}` : 'Sorry, I encountered an error.';
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Assistant</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><XIcon/></button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900">
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
                                                    {source.type === 'map' ? <MapIcon className="w-3 h-3 flex-shrink-0" /> : <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />}
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

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                     {chatError && <p className="text-red-500 text-xs mb-2 text-center">{chatError}</p>}
                    <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
                            placeholder={chatError ? "AI Assistant not available" : "Ask anything..."}
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
                            <span className={`text-xs font-medium ${enableGrounding ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Search Web & Maps</span>
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

// --- End of AI Assistant Modal ---


type AiFeature = 'summarizer' | 'studyGuide';

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-left w-full transition-all duration-300 hover:shadow-lg hover:border-blue-500/50 transform hover:-translate-y-1"
  >
    <div className="flex items-center gap-4">
      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">{icon}</div>
      <div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

const TextAiModal: React.FC<{
  feature: AiFeature;
  onClose: () => void;
}> = ({ feature, onClose }) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [enableThinking, setEnableThinking] = useState(false);
    
    const featureConfig = {
        summarizer: {
            title: "AI Document Summarizer",
            description: "Paste any text to get a concise summary.",
            placeholder: "Paste an article, lecture notes, or any text here...",
            action: summarizeDocument
        },
        studyGuide: {
            title: "AI Study Guide Generator",
            description: "Paste your source material to create a structured study guide.",
            placeholder: "Paste a chapter from your textbook, an academic article, or lecture transcript...",
            action: generateNotesFromText
        }
    };

    const config = featureConfig[feature];

    const handleGenerate = async () => {
        if (!inputText.trim()) {
            setError('Please paste some text to get started.');
            return;
        }
        setIsLoading(true);
        setResult('');
        setError('');

        try {
            const apiResult = await config.action(inputText, { enableThinking });
            setResult(apiResult);
        } catch (e: any) {
            setError(e.message || 'An unexpected client error occurred.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> {config.title}</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    {/* Input Side */}
                    <div className="flex flex-col gap-4">
                         <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input id="thinking-toggle" type="checkbox" className="sr-only" checked={enableThinking} onChange={e => setEnableThinking(e.target.checked)} />
                                    <div className="block bg-gray-200 dark:bg-gray-600 w-11 h-6 rounded-full"></div>
                                    <div className={`dot absolute left-1 top-1 bg-white dark:bg-gray-400 w-4 h-4 rounded-full transition-transform ${enableThinking ? 'translate-x-5 !bg-blue-600 dark:!bg-blue-500' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-semibold">Enable Thinking Mode</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Slower, more detailed results.</p>
                                </div>
                            </label>
                        </div>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={config.placeholder}
                            className="w-full flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 resize-none"
                        />
                         {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                     {/* Output Side */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                            </div>
                        ) : result ? (
                            <div className="prose max-w-none text-gray-700 dark:text-gray-300 dark:prose-invert whitespace-pre-wrap">{result}</div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <SparklesIcon className="w-12 h-12 mb-4"/>
                                <p>Your AI-generated content will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
// Fix: Add the missing AiToolsView component and its default export.
interface AiToolsViewProps {
    assignments: Assignment[];
    courses: Course[];
}

const AiToolsView: React.FC<AiToolsViewProps> = ({ assignments, courses }) => {
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const tools = [
        // Text-based tools
        { id: 'assistant', title: 'AI Assistant', description: 'Ask questions about your courses and assignments.', icon: <MessageCircleIcon className="w-6 h-6 text-blue-500" /> },
        { id: 'summarizer', title: 'Document Summarizer', description: 'Get a quick summary of any text.', icon: <DocumentTextIcon className="w-6 h-6 text-purple-500" /> },
        { id: 'studyGuide', title: 'Study Guide Generator', description: 'Create structured study notes from text.', icon: <BrainIcon className="w-6 h-6 text-green-500" /> },
        // Vision tools
        { id: 'imageAnalyzer', title: 'Image Analyzer', description: 'Upload an image and ask questions about it.', icon: <ImageIcon className="w-6 h-6 text-red-500" /> },
        { id: 'videoAnalyzer', title: 'Video Analyzer', description: 'Get summaries and insights from videos.', icon: <VideoIcon className="w-6 h-6 text-yellow-500" /> },
        { id: 'imageGenerator', title: 'Image Generator', description: 'Create unique images from text prompts.', icon: <Wand2Icon className="w-6 h-6 text-indigo-500" /> },
        { id: 'imageEditor', title: 'Image Editor', description: 'Edit existing images using text commands.', icon: <PaintBrushIcon className="w-6 h-6 text-pink-500" /> },
        { id: 'videoGenerator', title: 'Video Generator', description: 'Create short video clips from text or images.', icon: <VideoIcon className="w-6 h-6 text-orange-500" /> },
        // Audio tools
        { id: 'tts', title: 'Text-to-Speech', description: 'Convert text into natural-sounding audio.', icon: <VolumeUpIcon className="w-6 h-6 text-teal-500" /> },
        { id: 'audioTranscriber', title: 'Audio Transcriber', description: 'Transcribe spoken words from your microphone.', icon: <MicIcon className="w-6 h-6 text-cyan-500" /> },
        { id: 'liveConversation', title: 'Live Conversation', description: 'Have a real-time voice chat with an AI.', icon: <PhoneIcon className="w-6 h-6 text-lime-500" /> },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Tools</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Leverage the power of AI to enhance your learning experience.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    <FeatureCard
                        key={tool.id}
                        title={tool.title}
                        description={tool.description}
                        icon={tool.icon}
                        onClick={() => setActiveModal(tool.id)}
                    />
                ))}
            </div>

            {/* Modals */}
            {activeModal === 'assistant' && <AiAssistantModal isOpen={true} onClose={() => setActiveModal(null)} courses={courses} assignments={assignments} />}
            {activeModal === 'summarizer' && <TextAiModal feature="summarizer" onClose={() => setActiveModal(null)} />}
            {activeModal === 'studyGuide' && <TextAiModal feature="studyGuide" onClose={() => setActiveModal(null)} />}
            {activeModal === 'imageAnalyzer' && <ImageAnalyzerModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'videoAnalyzer' && <VideoAnalyzerModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'audioTranscriber' && <AudioTranscriberModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'imageGenerator' && <ImageGeneratorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'imageEditor' && <ImageEditorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'videoGenerator' && <VideoGeneratorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'tts' && <TtsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'liveConversation' && <LiveConversationModal onClose={() => setActiveModal(null)} />}
        </div>
    );
};

export default AiToolsView;