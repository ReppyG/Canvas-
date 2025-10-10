
import React, { useState } from 'react';
import { generateNotesFromText } from '../services/geminiService';
import { SparklesIcon, UploadIcon, DocumentTextIcon } from './icons/Icons';

type InputType = 'text' | 'file';

const NotesView: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>('text');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setInputText(''); // Clear text input when file is selected
      setNotes('');
      setError('');
    }
  };

  const handleGenerateNotes = async () => {
    if (inputType === 'text' && !inputText.trim()) {
      setError('Please enter some text to generate notes from.');
      return;
    }
    if (inputType === 'file' && !file) {
      setError('Please select a file first.');
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
      setNotes(result);
    } catch (e) {
      console.error(e);
      setError('Failed to process the input. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = () => {
    if (inputType === 'file') {
      return (
        <label htmlFor="file-upload" className="flex-1 w-full cursor-pointer">
          <div className="flex items-center justify-center w-full h-32 px-4 bg-gray-700 border-2 border-dashed border-gray-600 rounded-md hover:border-blue-500 transition-colors">
            <UploadIcon className="w-6 h-6 text-gray-400 mr-3"/>
            <span className="text-gray-300">{file ? file.name : 'Choose a text file...'}</span>
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
            setFile(null); // Clear file input when text is entered
        }}
        placeholder="Paste your article, assignment description, or any text here..."
        className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 resize-none"
      />
    );
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">AI Note Generator</h1>
      <p className="text-gray-400 mb-8">Generate structured notes from text or documents.</p>
      
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
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

        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="flex-1 w-full">
            {renderInput()}
          </div>
          <button
            onClick={handleGenerateNotes}
            disabled={(!file && !inputText.trim()) || isLoading}
            className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Generating...' : 'Generate Notes'}
          </button>
        </div>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>

      {(isLoading || notes) && (
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Notes</h2>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="w-12 h-12 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                {notes}
            </div>
          )}
        </div>
      )}
      <style>{`
        .tab-button { @apply flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors text-gray-400 border-transparent hover:text-white; }
        .tab-active { @apply border-blue-500 text-white; }
      `}</style>
    </div>
  );
};

export default NotesView;
