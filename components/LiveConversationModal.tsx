import React, { useState, useEffect, useRef } from 'react';
import { startLiveConversation, createAudioBlob } from '../services/geminiService';
import { XIcon, SparklesIcon, PhoneIcon, ExclamationTriangleIcon } from './icons/Icons';

interface LiveConversationModalProps {
    onClose: () => void;
}

type ConversationStatus = 'idle' | 'requesting' | 'active' | 'stopping' | 'error';

// Audio Decoding Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const LiveConversationModal: React.FC<LiveConversationModalProps> = ({ onClose }) => {
    const [status, setStatus] = useState<ConversationStatus>('idle');
    const [transcript, setTranscript] = useState<string>('');
    const [finalTranscript, setFinalTranscript] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef<boolean>(false);

    const cleanup = () => {
        console.log('Cleaning up live conversation resources...');
        setStatus('stopping');
        if (processorRef.current) processorRef.current.disconnect();
        if (sourceRef.current) sourceRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
        if (sessionRef.current) sessionRef.current.close();
        
        // Reset refs
        Object.assign(sessionRef, { current: null });
        Object.assign(inputAudioContextRef, { current: null });
        Object.assign(outputAudioContextRef, { current: null });
        Object.assign(streamRef, { current: null });
        Object.assign(processorRef, { current: null });
        Object.assign(sourceRef, { current: null });
        Object.assign(nextStartTimeRef, { current: 0 });
        Object.assign(audioQueueRef, { current: [] });
        Object.assign(isPlayingRef, { current: false });
        setStatus('idle');
    };

    useEffect(() => {
        return () => cleanup();
    }, []);
    
    const processAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
            return;
        }
        isPlayingRef.current = true;
        const audioB64 = audioQueueRef.current.shift();
        
        if (audioB64 && outputAudioContextRef.current) {
             try {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioB64), ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                source.onended = () => {
                    isPlayingRef.current = false;
                    processAudioQueue();
                };
            } catch (e) {
                console.error("Error processing audio queue:", e);
                isPlayingRef.current = false;
                processAudioQueue();
            }
        } else {
             isPlayingRef.current = false;
        }
    };


    const startConversation = async () => {
        setStatus('requesting');
        setError(null);
        setTranscript('');
        setFinalTranscript('');

        try {
            const sessionPromise = startLiveConversation({
                onAudio: (audioB64) => {
                    audioQueueRef.current.push(audioB64);
                    processAudioQueue();
                },
                onTranscription: (text, isFinal) => {
                    if(isFinal) {
                        setFinalTranscript(prev => prev + transcript + text);
                        setTranscript('');
                    } else {
                        setTranscript(text);
                    }
                },
                onError: (err) => {
                    setError(`Live session error: ${err.message}`);
                    setStatus('error');
                    cleanup();
                },
                onClose: () => {
                    cleanup();
                }
            });

            sessionPromise.then(session => sessionRef.current = session);
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const blob = createAudioBlob(inputData);
                sessionPromise.then(session => {
                    if (session && sessionRef.current) { // Check if session is still active
                       session.sendRealtimeInput({ media: blob });
                    }
                });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            setStatus('active');
        } catch (e: any) {
            console.error('Failed to start conversation:', e);
            setError(e.message || 'Failed to initialize microphone or AI service.');
            setStatus('error');
            cleanup();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/> Live AI Conversation</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-between bg-gray-50 dark:bg-gray-900">
                    <div className="w-full flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto">
                        {error ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-400">
                                <ExclamationTriangleIcon className="w-10 h-10 mb-2"/>
                                <p className="font-semibold">Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : (
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                <span className="text-gray-500 dark:text-gray-400">{finalTranscript}</span>
                                <span className="text-gray-900 dark:text-gray-100 font-semibold">{transcript}</span>
                            </p>
                        )}
                         {!error && !finalTranscript && !transcript && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Start the conversation to see your live transcription.
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={status === 'active' ? cleanup : startConversation} 
                            disabled={status === 'requesting' || status === 'stopping'}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-50
                                ${status === 'active' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'}`}
                        >
                            <PhoneIcon className={`w-10 h-10 transition-colors ${status === 'active' ? 'text-red-500' : 'text-blue-500'}`} />
                        </button>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mt-4">
                            {status === 'idle' && 'Start Conversation'}
                            {status === 'requesting' && 'Connecting...'}
                            {status === 'active' && 'Conversation Active'}
                            {status === 'stopping' && 'Stopping...'}
                            {status === 'error' && 'An error occurred'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveConversationModal;