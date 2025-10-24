/**
 * Secure Gemini Service Client
 * Uses lazy imports to avoid bundling server-side dependencies
 */

interface GenerationOptions {
    enableThinking?: boolean;
}

/**
 * Calls the secure Gemini proxy endpoint
 */
async function callGeminiProxy(action: string, payload: any): Promise<any> {
    const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI service error');
    }
    
    return response.json();
}

/**
 * Lazy-load Gemini SDK only when needed (client-side features)
 * This prevents build errors and reduces bundle size
 */
let GoogleGenAI: any = null;
let Type: any = null;

async function getGeminiSDK() {
    if (!GoogleGenAI) {
        const module = await import('@google/genai');
        GoogleGenAI = module.GoogleGenAI;
        Type = module.Type;
    }
    return { GoogleGenAI, Type };
}

let ai: any = null;

async function getClient(): Promise<any> {
    const { GoogleGenAI } = await getGeminiSDK();
    const key = process.env.API_KEY;
    if (!key) {
        throw new Error("Gemini API key is not configured for client-side features.");
    }
    if (ai) return ai;
    ai = new GoogleGenAI({ apiKey: key });
    return ai;
}

// ===== PROXIED FUNCTIONS (Secure - Go through server) =====

export const generateText = async (prompt: string): Promise<string> => {
    const result = await callGeminiProxy('generateText', { prompt });
    return result.text;
};

export const summarizeDocument = async (
    content: string, 
    options?: GenerationOptions
): Promise<string> => {
    const result = await callGeminiProxy('summarizeDocument', {
        content,
        enableThinking: options?.enableThinking || false
    });
    return result.text;
};

export const generateNotesFromText = async (
    content: string,
    options?: GenerationOptions
): Promise<string> => {
    const result = await callGeminiProxy('generateNotes', {
        content,
        enableThinking: options?.enableThinking || false
    });
    return result.text;
};

export const estimateAssignmentTime = async (assignment: any): Promise<string> => {
    const result = await callGeminiProxy('estimateTime', {
        assignmentName: assignment.name,
        description: assignment.description || 'No description',
        points: assignment.points_possible || 'N/A'
    });
    return result.text;
};

export const generateGroundedText = async (
    prompt: string
): Promise<{ text: string; sources: any[] }> => {
    const result = await callGeminiProxy('generateGroundedText', { prompt });
    return {
        text: result.text,
        sources: result.sources || []
    };
};

// ===== CLIENT-SIDE FUNCTIONS (Use SDK directly - for media/streaming) =====

export const createTutorChat = async (assignment: any): Promise<any> => {
    const client = await getClient();
       return client.models.startChat({
        model: 'gemini-2.5-flash',
        history: [],
        systemInstruction: `You are a patient tutor helping with: ${assignment.name}\nDescription: ${assignment.description || 'N/A'}\nUse the Socratic method and never give direct answers.`,
    });
};

export const createGlobalAssistantChat = async (context: string): Promise<any> => {
    const client = await getClient();
        return client.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are a helpful AI assistant. Student data: ${context}`
            },
    });
};

export const analyzeImage = async (
    base64Data: string, 
    mimeType: string, 
    prompt: string
): Promise<string> => {
    const client = await getClient();
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt }
            ]
        },
    });
    return response.text;
};

export const analyzeVideo = async (
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const client = await getClient();
    const response = await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt }
            ]
        },
    });
    return response.text;
};

export const generateImage = async (
    prompt: string,
    aspectRatio: string
): Promise<string> => {
    const client = await getClient();
    const response = await client.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as any,
        },
    });
    return response.generatedImages[0].image.imageBytes;
};

export const editImage = async (
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const { Modality } = await import('@google/genai');
    const client = await getClient();
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return part.inlineData.data;
    }
    throw new Error("AI did not return an edited image.");
};

export const generateVideo = async (
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    image?: { data: string; mimeType: string }
): Promise<any> => {
    const client = await getClient();
    return await client.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        ...(image && { image: { imageBytes: image.data, mimeType: image.mimeType } }),
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    });
};

export const getVideosOperation = async (operation: any): Promise<any> => {
    const client = await getClient();
    return await client.operations.getVideosOperation({ operation });
};

// ===== AUDIO UTILITIES =====

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

export const playAudio = async (base64Audio: string) => {
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
    );
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);
    source.start();
};

export const generateSpeech = async (text: string): Promise<string> => {
    const { Modality } = await import('@google/genai');
    const client = await getClient();
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("AI did not return any audio data.");
    }
    return base64Audio;
};

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function createAudioBlob(data: Float32Array): any {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export const startTranscriptionSession = async (
    callbacks: {
        onTranscriptionUpdate: (text: string, isFinal: boolean) => void,
        onError: (error: Error) => void,
        onClose: () => void,
    }
) => {
    const { Modality } = await import('@google/genai');
    const client = await getClient();
    const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened for transcription.'),
            onmessage: (message: any) => {
                if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    const isFinal = message.serverContent.turnComplete ?? false;
                    callbacks.onTranscriptionUpdate(text, isFinal);
                }
            },
            onerror: (e: ErrorEvent) => {
                console.error('Live session error:', e);
                callbacks.onError(new Error(e.message || "Live session error"));
            },
            onclose: (e: CloseEvent) => {
                console.log('Live session closed.');
                callbacks.onClose();
            },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
        },
    });
    return sessionPromise;
};

export const startLiveConversation = async (
    callbacks: {
        onAudio: (audioB64: string) => void,
        onTranscription: (text: string, isFinal: boolean) => void,
        onError: (error: Error) => void,
        onClose: () => void
    }
) => {
    const { Modality } = await import('@google/genai');
    const client = await getClient();
    const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened for conversation.'),
            onmessage: (message: any) => {
                const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audio) {
                    callbacks.onAudio(audio);
                }
                if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    const isFinal = message.serverContent.turnComplete ?? false;
                    callbacks.onTranscription(text, isFinal);
                }
            },
            onerror: (e: ErrorEvent) => {
                console.error('Live session error:', e);
                callbacks.onError(new Error(e.message || "Live session error"));
            },
            onclose: (e: CloseEvent) => {
                console.log('Live session closed.');
                callbacks.onClose();
            },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
        },
    });
    return sessionPromise;
};

// Study Plan with structured output
export const generateStudyPlan = async (
    assignment: any,
    options?: GenerationOptions
): Promise<any> => {
    const { Type } = await getGeminiSDK();
    const client = await getClient();
    
    const daysUntilDue = assignment.due_at 
        ? Math.ceil((new Date(assignment.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
        : 'N/A';

    const prompt = `Create a detailed study plan for: ${assignment.name}\nCourse: ${assignment.courseName}\nDue: ${assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'N/A'}\nDays left: ${daysUntilDue}\nDescription: ${assignment.description || 'None'}\nPoints: ${assignment.points_possible || 'N/A'}`;

    const schema: any = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
            steps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        order: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        estimatedMinutes: { type: Type.INTEGER },
                        priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        resources: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['order', 'title', 'description', 'estimatedMinutes', 'priority']
                }
            },
            milestones: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        completionPercentage: { type: Type.INTEGER },
                        description: { type: Type.STRING }
                    },
                    required: ['name', 'completionPercentage', 'description']
                }
            }
        },
        required: ['title', 'estimatedHours', 'steps', 'milestones']
    };
    
    const config: any = { responseMimeType: "application/json", responseSchema: schema };
    if (options?.enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: config
    });
    
    return JSON.parse(response.text);
};