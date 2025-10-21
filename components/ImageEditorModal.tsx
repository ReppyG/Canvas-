import React, { useState } from 'react';
import { editImage } from '../services/geminiService';
import { XIcon, SparklesIcon, UploadIcon, Loader2Icon } from './icons/Icons';

interface ImageEditorModalProps {
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

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ onClose }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [resultB64, setResultB64] = useState<string>('');
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
            setResultB64('');
            setError(null);
        }
    };
    
    const handleEdit = async () => {
        if (!imageFile) {
            setError('Please upload an image first.');
            return;
        }
        if (!prompt.trim()) {
            setError('Please enter an editing instruction.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultB64('');

        try {
            const base64Data = await fileToBase64(imageFile);
            const apiResult = await editImage(base64Data, imageFile.type, prompt);
            setResultB64(apiResult);
        } catch (e: any) {
            setError(e.message || 'Failed to edit image.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Image Editor</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    {/* Input Side */}
                    <div className="flex flex-col gap-4">
                         <label htmlFor="edit-file-upload" className="w-full cursor-pointer">
                            <div className="flex items-center justify-center w-full h-48 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-blue-500 transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="upload preview" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400">
                                        <UploadIcon className="w-8 h-8 mx-auto mb-2"/>
                                        <span className="font-semibold">Click to upload image to edit</span>
                                        <p className="text-xs mt-1">PNG, JPG, WEBP up to 4MB</p>
                                    </div>
                                )}
                            </div>
                            <input id="edit-file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your edits, e.g., 'Add a retro filter' or 'Remove the person in the background'..."
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 resize-none"
                            rows={3}
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            onClick={handleEdit}
                            disabled={isLoading || !imageFile}
                            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Editing...' : 'Apply Edits'}
                        </button>
                    </div>
                     {/* Output Side */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto flex items-center justify-center">
                        {isLoading ? (
                            <div className="text-center">
                                <Loader2Icon className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                                <p className="mt-3 text-gray-600 dark:text-gray-400">Applying your edits...</p>
                            </div>
                        ) : resultB64 ? (
                            <img src={`data:image/jpeg;base64,${resultB64}`} alt="Edited content" className="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <SparklesIcon className="w-12 h-12 mb-4"/>
                                <p>Your edited image will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;