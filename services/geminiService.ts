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
let GoogleGenerativeAI: any = null;
let SchemaType: any = null;

async function getGeminiSDK() {
    if (!GoogleGenerativeAI) {
        const module = await import('@google/generative-ai');
        GoogleGenerativeAI = module.GoogleGenerativeAI;
        SchemaType = module.SchemaType;
    }
    return { GoogleGenerativeAI, SchemaType };
}

let ai: any = null;

async function getClient(): Promise<any> {
    const { GoogleGenerativeAI } = await getGeminiSDK();
    const key = process.env.API_KEY;
    if (!key) {
        throw new Error("Gemini API key is not configured for client-side features.");
    }
    if (ai) return ai;
    ai = new GoogleGenerativeAI(key);
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
    const model = client.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: `You are a patient tutor helping with: ${assignment.name}\nDescription: ${assignment.description || 'N/A'}\nUse the Socratic method and never give direct answers.`
    });
    return model.startChat({
        history: [],
    });
};

export const createGlobalAssistantChat = async (context: string): Promise<any> => {
    const client = await getClient();
    const model = client.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: `You are a helpful AI assistant. Student data: ${context}`
    });
    return model.startChat({
        history: [],
    });
};

export const analyzeImage = async (
    base64Data: string, 
    mimeType: string, 
    prompt: string
): Promise<string> => {
    const client = await getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        prompt
    ]);
    const response = await result.response;
    return response.text();
};

export const analyzeVideo = async (
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const client = await getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        prompt
    ]);
    const response = await result.response;
    return response.text();
};

export const generateImage = async (
    prompt: string,
    aspectRatio: string
): Promise<string> => {
    // Note: Image generation requires the Imagen API which may not be available in the current SDK version
    // This is a placeholder that needs to be implemented with the proper API
    throw new Error("Image generation is not currently available. Please use the Google AI Studio for image generation.");
};

export const editImage = async (
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    // Note: Image editing requires specific model support which may not be available
    // This is a placeholder that needs to be implemented with the proper API
    throw new Error("Image editing is not currently available. Please use the Google AI Studio for image editing.");
};

export const generateVideo = async (
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    image?: { data: string; mimeType: string }
): Promise<any> => {
    // Note: Video generation requires the Veo API which is not available in the current SDK version
    // This is a placeholder that needs to be implemented with the proper API
    throw new Error("Video generation is not currently available. Please use the Google AI Studio for video generation.");
};

export const getVideosOperation = async (operation: any): Promise<any> => {
    // Note: This requires video generation API support
    throw new Error("Video operations are not currently available.");
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
    // Note: Text-to-speech requires specific model support which may not be available
    // This is a placeholder that needs to be implemented with the proper API
    throw new Error("Text-to-speech is not currently available. Please use the Google Cloud Text-to-Speech API.");
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
    // Note: Live transcription requires specific API support which may not be available
    throw new Error("Live transcription is not currently available. Please use the Google Cloud Speech-to-Text API.");
};

export const startLiveConversation = async (
    callbacks: {
        onAudio: (audioB64: string) => void,
        onTranscription: (text: string, isFinal: boolean) => void,
        onError: (error: Error) => void,
        onClose: () => void
    }
) => {
    // Note: Live conversation requires specific API support which may not be available
    throw new Error("Live conversation is not currently available. Please use the Google Cloud Speech and Text-to-Speech APIs.");
};

// Study Plan with structured output
export const generateStudyPlan = async (
    assignment: any,
    options?: GenerationOptions
): Promise<any> => {
    const { SchemaType } = await getGeminiSDK();
    const client = await getClient();
    
    const daysUntilDue = assignment.due_at 
        ? Math.ceil((new Date(assignment.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
        : 'N/A';

    const prompt = `Create a detailed study plan for: ${assignment.name}
Course: ${assignment.courseName}
Due: ${assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'N/A'}
Days left: ${daysUntilDue}
Description: ${assignment.description || 'None'}
Points: ${assignment.points_possible || 'N/A'}`;

    const schema: any = {
        type: SchemaType.OBJECT,
        properties: {
            title: { type: SchemaType.STRING },
            estimatedHours: { type: SchemaType.NUMBER },
            steps: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        order: { type: SchemaType.INTEGER },
                        title: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING },
                        estimatedMinutes: { type: SchemaType.INTEGER },
                        priority: { type: SchemaType.STRING, enum: ['high', 'medium', 'low'] },
                        resources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                    },
                    required: ['order', 'title', 'description', 'estimatedMinutes', 'priority']
                }
            },
            milestones: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        name: { type: SchemaType.STRING },
                        completionPercentage: { type: SchemaType.INTEGER },
                        description: { type: SchemaType.STRING }
                    },
                    required: ['name', 'completionPercentage', 'description']
                }
            }
        },
        required: ['title', 'estimatedHours', 'steps', 'milestones']
    };
    
    const model = client.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
};
