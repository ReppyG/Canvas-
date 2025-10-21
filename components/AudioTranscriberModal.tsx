import React, { useState, useEffect, useRef } from 'react';
// Fix: Use the correct `Connection` type instead of the removed `LiveSession` type.
import { Connection } from '@google/genai';
import { startTranscriptionSession, createAudioBlob } from '../services/geminiService';
import { XIcon, SparklesIcon, MicIcon, StopCircleIcon, ExclamationTriangleIcon } from './icons/Icons';

interface AudioTranscriberModalProps {
    onClose: () => void;
}

type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error';

const AudioTranscriberModal: React.FC<AudioTranscriberModalProps> = ({ onClose }) => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [transcript, setTranscript] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<Connection | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const cleanup = () => {
        console.log('Cleaning up audio resources...');
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const startRecording = async () => {
        setStatus('requesting');
        setError(null);
        setTranscript('');

        try {
            const session = await startTranscriptionSession({
                onTranscriptionUpdate: (text, isFinal) => {
                    setTranscript(prev => prev + text);
                },
                onError: (err) => {
                    setError(`Live session error: ${err.message}`);
                    setStatus('error');
                    cleanup();
                },
                onClose: () => {
                    setStatus('idle');
                    cleanup();
                }
            });
            sessionRef.current = session;
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Fix: Cast `window` to `any` to allow access to vendor-prefixed `webkitAudioContext` for broader browser compatibility.
            const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = context;

            const source = context.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = context.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const blob = createAudioBlob(inputData);
                session.sendRealtimeInput({ media: blob });
            };

            source.connect(processor);
            processor.connect(context.destination);

            setStatus('recording');
        } catch (e: any) {
            console.error('Failed to start recording session:', e);
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                setError('Microphone permission denied. Please allow microphone access in your browser settings.');
            } else {
                setError(e.message || 'Failed to initialize microphone or AI service.');
            }
            setStatus('error');
            cleanup();
        }
    };

    const stopRecording = () => {
        setStatus('stopping');
        cleanup();
        // The onClose callback in startTranscriptionSession will set status to idle
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> AI Audio Transcriber</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="w-full text-center">
                        {status === 'recording' ? (
                             <button onClick={stopRecording} className="mb-6 w-24 h-24 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center transition-transform hover:scale-105">
                                <StopCircleIcon className="w-12 h-12 text-red-500"/>
                            </button>
                        ) : (
                            <button onClick={startRecording} disabled={status === 'requesting'} className="mb-6 w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-50">
                                <MicIcon className="w-12 h-12 text-blue-500"/>
                            </button>
                        )}
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {status === 'idle' && 'Press the button to start recording'}
                            {status === 'requesting' && 'Requesting microphone access...'}
                            {status === 'recording' && 'Recording... Press to stop'}
                            {status === 'stopping' && 'Stopping session...'}
                            {status === 'error' && 'An error occurred'}
                        </p>
                    </div>

                    <div className="w-full h-64 mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto">
                        {error && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-400">
                                <ExclamationTriangleIcon className="w-10 h-10 mb-2"/>
                                <p className="font-semibold">Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                        {!error && transcript && <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{transcript}</p>}
                        {!error && !transcript && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Your live transcription will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioTranscriberModal;