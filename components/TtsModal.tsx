import React, { useState } from 'react';
import { generateSpeech, playAudio } from '../services/geminiService';
import { XIcon, SparklesIcon, VolumeUpIcon, Loader2Icon } from './icons/Icons';

interface TtsModalProps {
    onClose: () => void;
}

const TtsModal: React.FC<TtsModalProps> = ({ onClose }) => {
    const [text, setText] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError('Please enter some text to generate speech.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const audioB64 = await generateSpeech(text);
            await playAudio(audioB64);
        } catch (e: any) {
            setError(e.message || 'Failed to generate speech.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> Text-to-Speech</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-900 flex-1 flex flex-col gap-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste or type any text here to have it read aloud..."
                        className="w-full flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 resize-none"
                        rows={10}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <VolumeUpIcon className="w-5 h-5 mr-2" />
                        )}
                        {isLoading ? 'Generating...' : 'Generate & Play Audio'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TtsModal;