import React, { useState } from 'react';
import { Assignment, Course } from '../types';
import { SparklesIcon, DocumentTextIcon, BrainIcon, ImageIcon, MicIcon } from './icons/Icons';
import { generateNotesFromText, summarizeDocument } from '../services/geminiService';
import ImageAnalyzerModal from './ImageAnalyzerModal';
import AudioTranscriberModal from './AudioTranscriberModal';

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
    )
}


const AiToolsView: React.FC<{ assignments: Assignment[]; courses: Course[] }> = () => {
  const [activeTextModal, setActiveTextModal] = useState<AiFeature | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Tools</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Your intelligent toolkit for enhanced learning.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<DocumentTextIcon className="w-6 h-6 text-blue-500" />}
          title="AI Summarizer"
          description="Condense articles, papers, or notes into key points."
          onClick={() => setActiveTextModal('summarizer')}
        />
        <FeatureCard
          icon={<BrainIcon className="w-6 h-6 text-purple-500" />}
          title="Study Guide Generator"
          description="Create structured study guides from your course materials."
          onClick={() => setActiveTextModal('studyGuide')}
        />
        <FeatureCard
          icon={<ImageIcon className="w-6 h-6 text-green-500" />}
          title="Image Analyzer"
          description="Upload an image and ask questions about its content."
          onClick={() => setIsImageModalOpen(true)}
        />
        <FeatureCard
          icon={<MicIcon className="w-6 h-6 text-red-500" />}
          title="Audio Transcriber"
          description="Record your voice and get a live transcription."
          onClick={() => setIsAudioModalOpen(true)}
        />
        <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-dashed border-blue-200 dark:border-blue-800/50 text-center">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-lg flex items-center justify-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-500" /> Assignment-Specific Tools</h3>
            <p className="text-blue-800 dark:text-blue-300 mt-2 text-sm max-w-2xl mx-auto">
                For the <span className="font-semibold text-blue-900 dark:text-blue-100">AI Study Planner</span> and <span className="font-semibold text-blue-900 dark:text-blue-100">AI Tutor</span>, please navigate to the "Assignments" page and select the specific assignment you need help with.
            </p>
        </div>
      </div>
      
      {activeTextModal && <TextAiModal feature={activeTextModal} onClose={() => setActiveTextModal(null)} />}
      {isImageModalOpen && <ImageAnalyzerModal onClose={() => setIsImageModalOpen(false)} />}
      {isAudioModalOpen && <AudioTranscriberModal onClose={() => setIsAudioModalOpen(false)} />}
    </div>
  );
};

export default AiToolsView;