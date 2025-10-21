

import React, { useState } from 'react';
import { Assignment, Course } from '../types';
import { SparklesIcon, DocumentTextIcon, BrainIcon, MessageCircleIcon } from './icons/Icons';
// Fix: Import missing functions
import { generateNotesFromText, summarizeDocument } from '../services/geminiService';

type AiFeature = 'summarizer' | 'studyGuide';

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-left w-full transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 hover:border-blue-500/50 transform hover:-translate-y-1"
  >
    <div className="flex items-center gap-4">
      <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
      <div>
        <h3 className="font-bold text-lg text-white">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
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
            const apiResult = await config.action(inputText);
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
            <div className="bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-400"/> {config.title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Input Side */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold text-white">{config.description}</h3>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={config.placeholder}
                            className="w-full flex-1 p-3 bg-gray-900/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 resize-none"
                        />
                         {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                     {/* Output Side */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="w-12 h-12 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
                            </div>
                        ) : result ? (
                            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">{result}</div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
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


const AiToolsView: React.FC<{ assignments: Assignment[]; courses: Course[] }> = ({ assignments, courses }) => {
  const [activeModal, setActiveModal] = useState<AiFeature | null>(null);

  // Note: For this version, Study Planner and Tutor are accessed via the Assignments page.
  // This view serves as a hub and provides access to text/document based tools.
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">AI Tools</h1>
      <p className="text-gray-400 mb-8">Your intelligent toolkit for enhanced learning.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<DocumentTextIcon className="w-6 h-6 text-blue-400" />}
          title="AI Summarizer"
          description="Condense articles, papers, or notes into key points."
          onClick={() => setActiveModal('summarizer')}
        />
        <FeatureCard
          icon={<BrainIcon className="w-6 h-6 text-purple-400" />}
          title="Study Guide Generator"
          description="Create structured study guides from your course materials."
          onClick={() => setActiveModal('studyGuide')}
        />
        <div className="md:col-span-2 bg-gray-800/50 p-6 rounded-lg border border-dashed border-gray-700 text-center">
            <h3 className="font-semibold text-white text-lg flex items-center justify-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400" /> Assignment-Specific Tools</h3>
            <p className="text-gray-400 mt-2 text-sm max-w-2xl mx-auto">
                For the <span className="font-semibold text-yellow-300">AI Study Planner</span> and <span className="font-semibold text-yellow-300">AI Tutor</span>, please navigate to the &quot;Assignments&quot; page and select the specific assignment you need help with.
            </p>
        </div>
      </div>
      
      {activeModal && <TextAiModal feature={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
};

export default AiToolsView;
