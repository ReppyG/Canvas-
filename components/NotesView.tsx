

import React, { useState } from 'react';
// Fix: Import missing function
import { generateNotesFromText } from '../services/geminiService';
// Fix: Import missing icons
import { SparklesIcon, UploadIcon, DocumentTextIcon, ClipboardIcon, ExclamationTriangleIcon } from './icons/Icons';

type InputType = 'text' | 'file';

const SkeletonLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-1/3 mt-6"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
);

const NotesView: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>('text');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setInputText('');
      setNotes('');
      setError('');
    }
  };

  const handleGenerateNotes = async () => {
    const hasInput = (inputType === 'text' && inputText.trim() !== '') || (inputType === 'file' && file !== null);
    
    if (!hasInput) {
      setError('Please provide text or a file to generate a study guide from.');
      return;
    }

    setIsLoading(true);
    setNotes('');
    setError('');

    try {
      let content = '';
      if (inputType === 'file' && file) {
        content = await file.text();
      } else {
        content = inputText;
      }
      const result = await generateNotesFromText(content);
      // The service now throws, so we catch it below. The result is always a string on success.
      setNotes(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected client-side error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (notes) {
        navigator.clipboard.writeText(notes);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const renderInput = () => {
    if (inputType === 'file') {
      return (
        <label htmlFor="file-upload" className="w-full cursor-pointer">
          <div className="flex items-center justify-center w-full h-full min-h-[16rem] px-4 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-md hover:border-blue-500 transition-colors">
            <div className="text-center">
              <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2"/>
              <span className="text-gray-300 font-semibold">{file ? file.name : 'Click to select a file'}</span>
              <p className="text-xs text-gray-500 mt-1">.txt, .md, or other text files</p>
            </div>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.text" />
        </label>
      );
    }
    return (
      <textarea
        value={inputText}
        onChange={(e) => {
            setInputText(e.target.value);
            if (e.target.value) setError('');
            setFile(null);
        }}
        placeholder="e.g., Paste a chapter from your textbook, an academic article, or lecture transcript..."
        className="w-full h-full min-h-[16rem] p-4 bg-gray-900/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 resize-y"
      />
    );
  };

  const renderError = () => {
    if (!error) return null;

    const isConfigError = error.includes('Invalid API Key') || error.includes('not configured');
    const isGenericAiError = error.startsWith('[AI Error]');

    return (
        <div className={`mt-4 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm`}>
            <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-400"/>
                <div>
                    <h4 className="font-bold text-red-200">
                        {isConfigError ? "AI Service Not Configured" : "Generation Failed"}
                    </h4>
                    {isConfigError ? (
                        <p className="mt-1">
                           The application's AI features could not be accessed. This is likely due to a missing or invalid API key in the application's configuration. Please contact the administrator to resolve this issue.
                        </p>
                    ) : (
                        <p className="mt-1 whitespace-pre-wrap">{isGenericAiError ? error.replace('[AI Error]', '').trim() : error}</p>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">AI Study Guide Generator</h1>
      <p className="text-gray-400 mb-8">Generate a structured study guide from raw text or documents.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col">
          <div className="flex mb-4 border-b border-gray-700">
              <button onClick={() => setInputType('text')} className={`tab-button ${inputType === 'text' ? 'tab-active' : ''}`}>
                  <DocumentTextIcon className="w-5 h-5 mr-2"/>
                  From Text
              </button>
              <button onClick={() => setInputType('file')} className={`tab-button ${inputType === 'file' ? 'tab-active' : ''}`}>
                  <UploadIcon className="w-5 h-5 mr-2"/>
                  From File
              </button>
          </div>
          <div className="flex-1 flex">
            {renderInput()}
          </div>
          {renderError()}
          <button
            onClick={handleGenerateNotes}
            disabled={(!file && !inputText.trim()) || isLoading}
            className="w-full mt-4 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Generating...' : 'Generate Study Guide'}
          </button>
        </div>

        {/* Output Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Your Study Guide</h2>
              <button 
                onClick={handleCopy} 
                disabled={!notes || isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <ClipboardIcon className="w-4 h-4" />
                  {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="h-full max-h-[65vh] overflow-y-auto pr-2">
              {isLoading ? (
                <SkeletonLoader />
              ) : notes ? (
                <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                    {notes}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <SparklesIcon className="w-12 h-12 mb-4"/>
                    <p>Your generated guide will appear here.</p>
                </div>
              )}
            </div>
        </div>
      </div>
      <style>{`
        .tab-button { @apply flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors text-gray-400 border-transparent hover:text-white; }
        .tab-active { @apply border-blue-500 text-white; }
      `}</style>
    </div>
  );
};

export default NotesView;
