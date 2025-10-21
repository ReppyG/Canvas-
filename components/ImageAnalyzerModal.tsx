import React, { useState } from 'react';
import { analyzeImage } from '../services/geminiService';
import { XIcon, SparklesIcon, UploadIcon, Loader2Icon } from './icons/Icons';

interface ImageAnalyzerModalProps {
    onClose: () => void;
}

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const ImageAnalyzerModal: React.FC<ImageAnalyzerModalProps> = ({ onClose }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Describe this image in detail.');
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('Image size should be less than 4MB.');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setResult('');
            setError(null);
        }
    };
    
    const handleAnalyze = async () => {
        if (!imageFile) {
            setError('Please upload an image first.');
            return;
        }
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult('');

        try {
            const part = await fileToGenerativePart(imageFile);
            const apiResult = await analyzeImage(part.inlineData.data, part.inlineData.mimeType, prompt);
            setResult(apiResult);
        } catch (e: any) {
            setError(e.message || 'Failed to analyze image.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Image Analyzer</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    {/* Input Side */}
                    <div className="flex flex-col gap-4">
                         <label htmlFor="file-upload" className="w-full cursor-pointer">
                            <div className="flex items-center justify-center w-full h-48 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-blue-500 transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="upload preview" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400">
                                        <UploadIcon className="w-8 h-8 mx-auto mb-2"/>
                                        <span className="font-semibold">Click to upload image</span>
                                        <p className="text-xs mt-1">PNG, JPG, WEBP up to 4MB</p>
                                    </div>
                                )}
                            </div>
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ask a question about the image..."
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 resize-none"
                            rows={3}
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !imageFile}
                            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Analyzing...' : 'Analyze Image'}
                        </button>
                    </div>
                     {/* Output Side */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2Icon className="w-12 h-12 animate-spin text-blue-500" />
                            </div>
                        ) : result ? (
                            <div className="prose max-w-none text-gray-700 dark:text-gray-300 dark:prose-invert whitespace-pre-wrap">{result}</div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <SparklesIcon className="w-12 h-12 mb-4"/>
                                <p>The analysis of your image will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzerModal;
