


import React, { useState, useCallback } from 'react';
// Fix: Import missing summarizeDocument function
import { summarizeDocument } from '../services/geminiService';
// Fix: Import missing UploadIcon
import { SparklesIcon, UploadIcon } from './icons/Icons';

const SummarizerView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setSummary('');
      setError('');
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setSummary('');
    setError('');

    try {
      const fileContent = await file.text();
      const result = await summarizeDocument(fileContent);
      setSummary(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to read or summarize the file. Please try again with a plain text file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">AI Document Summarizer</h1>
      <p className="text-gray-400 mb-8">Upload a text-based document (.txt, .md, etc.) to get a concise summary.</p>
      
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <label htmlFor="file-upload" className="flex-1 w-full cursor-pointer">
            <div className="flex items-center justify-center w-full h-16 px-4 bg-gray-700 border-2 border-dashed border-gray-600 rounded-md hover:border-blue-500 transition-colors">
              <UploadIcon className="w-5 h-5 text-gray-400 mr-3"/>
              <span className="text-gray-300">{file ? file.name : 'Choose a file...'}</span>
            </div>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.text" />
          </label>
          <button
            onClick={handleSummarize}
            disabled={!file || isLoading}
            className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>

      {(isLoading || summary) && (
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="w-12 h-12 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                {summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SummarizerView;
