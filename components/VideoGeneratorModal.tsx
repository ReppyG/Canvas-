import React, { useState, useEffect, useRef } from 'react';
import { generateVideo, getVideosOperation } from '../services/geminiService';
import { XIcon, SparklesIcon, VideoIcon, Loader2Icon, UploadIcon, ExclamationTriangleIcon } from './icons/Icons';
import { Operation } from '@google/genai';

interface VideoGeneratorModalProps {
    onClose: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const VideoGeneratorModal: React.FC<VideoGeneratorModalProps> = ({ onClose }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>("16:9");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const pollingRef = useRef<boolean>(false);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkKey();
        return () => { pollingRef.current = false; };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('Image size should be less than 4MB.');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && !imageFile) {
            setError('Please enter a prompt or upload an image.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl('');
        pollingRef.current = true;

        try {
            setLoadingMessage('Initializing video generation...');
            let imagePayload;
            if (imageFile) {
                const data = await fileToBase64(imageFile);
                imagePayload = { data, mimeType: imageFile.type };
            }

            let operation = await generateVideo(prompt, aspectRatio, imagePayload);
            
            setLoadingMessage('Generating video... This may take a few minutes.');

            while (pollingRef.current && !operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                if (!pollingRef.current) break; // Stop polling if component unmounted or process stopped
                setLoadingMessage('Checking progress...');
                operation = await getVideosOperation(operation);
            }

            if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
                setLoadingMessage('Video generated! Preparing for playback...');
                const downloadLink = operation.response.generatedVideos[0].video.uri;
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) throw new Error('Failed to download the generated video.');
                const videoBlob = await response.blob();
                const videoUrl = URL.createObjectURL(videoBlob);
                setGeneratedVideoUrl(videoUrl);
            } else if (operation.error) {
                 throw new Error(`Video generation failed: ${operation.error.message}`);
            } else if (pollingRef.current) { // Only throw if not cancelled
                throw new Error('Video generation finished without a valid result.');
            }
        } catch (e: any) {
            console.error(e);
            if (e.message.includes('Requested entity was not found')) {
                setError('The selected API key is invalid. Please select a valid key and try again.');
                setApiKeySelected(false);
            } else {
                setError(e.message || 'Failed to generate video.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race condition, let API call fail if needed.
            setApiKeySelected(true);
            setError(null);
        }
    };

    if (!apiKeySelected) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg text-center p-8" onClick={e => e.stopPropagation()}>
                     <VideoIcon className="w-12 h-12 mx-auto mb-4 text-blue-500"/>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">API Key Required</h2>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">Video generation requires a personal API key with billing enabled. Please select your key to proceed.</p>
                     <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">For more details, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">billing documentation</a>.</p>
                     {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
                     <div className="mt-6 flex gap-4">
                        <button onClick={onClose} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button>
                        <button onClick={handleSelectKey} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Select API Key</button>
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                 <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Video Generator</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                     {/* Input Side */}
                    <div className="flex flex-col gap-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the video you want to create..."
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 resize-none"
                            rows={6}
                        />
                         <label htmlFor="video-image-upload" className="w-full cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                            Optional Starting Image
                            <div className="mt-2 flex items-center justify-center w-full h-32 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-blue-500 transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="upload preview" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400">
                                        <UploadIcon className="w-6 h-6 mx-auto mb-1"/>
                                        <span className="font-semibold text-xs">Click to upload</span>
                                    </div>
                                )}
                            </div>
                            <input id="video-image-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                        </label>
                        <div>
                            <label htmlFor="video-aspect-ratio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspect Ratio</label>
                            <select
                                id="video-aspect-ratio"
                                value={aspectRatio}
                                onChange={e => setAspectRatio(e.target.value as any)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                            </select>
                        </div>
                        {error && <p className="text-red-500 text-sm flex items-start gap-2"><ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" /> {error}</p>}
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Generating...' : 'Generate Video'}
                        </button>
                    </div>
                     {/* Output Side */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto flex items-center justify-center">
                        {isLoading ? (
                            <div className="text-center">
                                <Loader2Icon className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                                <p className="mt-3 text-gray-600 dark:text-gray-400">{loadingMessage}</p>
                            </div>
                        ) : generatedVideoUrl ? (
                            <video src={generatedVideoUrl} controls autoPlay loop className="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <VideoIcon className="w-12 h-12 mb-4"/>
                                <p>Your generated video will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoGeneratorModal;