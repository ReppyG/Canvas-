import { GoogleGenAI, Type, Chat, LiveServerMessage, Modality, Blob, Operation } from "@google/genai";
import { Assignment, StudyPlan, Summary, ChatMessage, AiTutorMessage, GroundingSource } from "../types";

let ai: GoogleGenAI | null = null;
const studyPlanModel = "gemini-2.5-pro";
const summaryModel = "gemini-2.5-pro";
const videoModel = "gemini-2.5-pro";
const chatModel = "gemini-2.5-flash";
const fastModel = "gemini-flash-lite-latest";
const imageGenModel = 'imagen-4.0-generate-001';
const videoGenModel = 'veo-3.1-fast-generate-preview';
const imageEditModel = 'gemini-2.5-flash-image';
const ttsModel = 'gemini-2.5-flash-preview-tts';
const liveModel = 'gemini-2.5-flash-native-audio-preview-09-2025';

function getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || import.meta.env.VITE_API_KEY;
    if (!key) {
        throw new Error("Gemini API key is not configured. Please set the API_KEY environment variable.");
    }
    // For features requiring user-selected keys (like Veo), we create a new instance.
    if (apiKey) {
        return new GoogleGenAI({ apiKey: key });
    }
    if (ai) return ai;
    ai = new GoogleGenAI({ apiKey: key });
    return ai;
}

const handleApiError = (error: unknown) : never => {
    console.error("Error communicating with Gemini API:", error);
    if (error instanceof Error) {
        // Passthrough for our specific configuration error
        if (error.message.startsWith("Gemini API key is not configured")) {
            throw error;
        }
        if (error.message.includes('API key')) {
             throw new Error(`[AI Error] The configured Gemini API Key is invalid or has insufficient permissions.`);
        }
        if (error.message.includes('RESOURCE_EXHAUSTED')) {
            throw new Error(`[AI Error] You have exceeded the API request limit. Please wait a moment before trying again.`);
        }
        if (error.message.includes('Requested entity was not found')) {
            throw new Error(`[AI Error] The API key is invalid or not properly selected for this project. Please select a valid key.`);
        }
        throw new Error(`[AI Error] An unexpected error occurred: ${error.message}`);
    }
    throw new Error("[AI Error] An unknown error occurred while communicating with the AI.");
}

interface GenerationOptions {
    enableThinking?: boolean;
}

// --- Audio Decoding Helpers (for TTS & Live API) ---
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
    // Standard sample rate for TTS model
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
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

export const generateStudyPlan = async (assignment: Assignment, options?: GenerationOptions): Promise<StudyPlan> => {
    const client = getClient();
    const daysUntilDue = assignment.due_at ? Math.ceil((new Date(assignment.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';

    const prompt = `You are an expert academic advisor. Create a detailed study plan for this assignment:
Assignment: ${assignment.name}
Course: ${assignment.courseName}
Due Date: ${assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'N/A'}
Days Until Due: ${daysUntilDue}
Description: ${assignment.description || 'No description provided'}
Points: ${assignment.points_possible || 'N/A'}
Create a JSON study plan. Make it practical, actionable, and tailored to the time available. Output ONLY the JSON object.`;

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

    try {
        const response = await client.models.generateContent({
            model: studyPlanModel,
            contents: prompt,
            config: config
        });
        return JSON.parse(response.text) as StudyPlan;
    } catch(error) {
        handleApiError(error);
    }
};

export const generateSummary = async (content: string, options?: GenerationOptions): Promise<Summary> => {
    const client = getClient();
    const prompt = `You are an expert educator. Summarize this educational content in a structured way.
Content to summarize:
${content}
Output ONLY a valid JSON object matching the provided schema.`;

    const schema: any = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            mainTopics: { type: Type.ARRAY, items: { type: Type.STRING }},
            keyPoints: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        concept: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        importance: { type: Type.STRING, enum: ['critical', 'important', 'supplementary'] }
                    },
                    required: ['concept', 'explanation', 'importance']
                }
            },
            definitions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { term: { type: Type.STRING }, definition: { type: Type.STRING }},
                    required: ['term', 'definition']
                }
            },
            examples: { type: Type.ARRAY, items: { type: Type.STRING }},
            studyTips: { type: Type.ARRAY, items: { type: Type.STRING }},
        },
        required: ['title', 'mainTopics', 'keyPoints', 'definitions', 'examples', 'studyTips']
    };
    
    const config: any = { responseMimeType: "application/json", responseSchema: schema };
    if (options?.enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    
    try {
        const response = await client.models.generateContent({
            model: summaryModel,
            contents: prompt,
            config: config
        });
        return JSON.parse(response.text) as Summary;
    } catch(error) {
        handleApiError(error);
    }
};

export const getTutorResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const client = getClient();
    const chat = client.chats.create({
        model: chatModel,
        config: {
            systemInstruction: `You are a patient, knowledgeable tutor helping a student. Use the Socratic method when appropriate, encourage critical thinking, and never give direct answers to homework. Be supportive and encouraging.`
        },
        history: history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{text: m.content}]
        }))
    });

    try {
        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateText = async (prompt: string): Promise<string> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: fastModel,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

export const summarizeDocument = async (content: string, options?: GenerationOptions): Promise<string> => {
    const client = getClient();
    const prompt = `Summarize this document concisely:\n\n${content}`;
    const config: any = {};
    if (options?.enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    try {
        const response = await client.models.generateContent({
            model: summaryModel,
            contents: prompt,
            config: config,
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateNotesFromText = async (content: string, options?: GenerationOptions): Promise<string> => {
    const client = getClient();
    const prompt = `You are an expert student. Create a structured study guide from the following text. Use markdown for formatting, including headings, bullet points, and bold text for key terms.
    Content to process:
    ${content}`;
    const config: any = {};
    if (options?.enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    try {
        const response = await client.models.generateContent({
            model: summaryModel,
            contents: prompt,
            config: config,
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

export const estimateAssignmentTime = async (assignment: Assignment): Promise<string> => {
    const client = getClient();
    const prompt = `Based on the following assignment details, estimate the time required to complete it. Provide a concise estimate like "2-3 hours" or "45 minutes".
    Assignment: ${assignment.name}
    Description: ${assignment.description || 'No description provided.'}
    Points: ${assignment.points_possible || 'N/A'}`;

    try {
        const response = await client.models.generateContent({
            model: fastModel,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        handleApiError(error);
    }
};

export const createTutorChat = (assignment: Assignment): Chat => {
    const client = getClient();
    const chat = client.chats.create({
        model: chatModel,
        config: {
            systemInstruction: `You are a patient, knowledgeable tutor helping a student with a specific assignment.
            Assignment: ${assignment.name}
            Description: ${assignment.description || 'No description provided.'}
            Use the Socratic method when appropriate, encourage critical thinking, and never give direct answers to homework. Be supportive and encouraging.`
        },
    });
    return chat;
};

export const createGlobalAssistantChat = (context: string): Chat => {
    const client = getClient();
    const chat = client.chats.create({
        model: chatModel,
        config: {
            systemInstruction: `You are a helpful AI assistant for a student. You have access to their course and assignment data to answer questions. Be concise and helpful. Here is the student's data: ${context}`
        },
    });
    return chat;
};

export const generateGroundedText = async (fullPrompt: string): Promise<{ text: string, sources: GroundingSource[] }> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                tools: [{ googleSearch: {} }, { googleMaps: {} }],
            },
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => {
                if (chunk.web) return { type: 'web' as const, uri: chunk.web.uri || '', title: chunk.web.title || 'Untitled Source' };
                if (chunk.maps) return { type: 'map' as const, uri: chunk.maps.uri || '', title: chunk.maps.title || 'Untitled Place' };
                return null;
            })
            .filter((source): source is GroundingSource => source !== null && !!source.uri);

        const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

        return { text, sources: uniqueSources };
    } catch (error) {
        handleApiError(error);
    }
};

export const analyzeImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const client = getClient();
    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };
        const textPart = {
            text: prompt
        };
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

export const analyzeVideo = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const client = getClient();
    try {
        const videoPart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };
        const textPart = {
            text: prompt
        };
        const response = await client.models.generateContent({
            model: videoModel,
            contents: { parts: [videoPart, textPart] },
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
    }
};

// --- Image Generation Service ---
export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const client = getClient();
    try {
        const response = await client.models.generateImages({
            model: imageGenModel,
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as any,
            },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        handleApiError(error);
    }
};

// --- Image Editing Service ---
export const editImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: imageEditModel,
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: mimeType } },
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
    } catch (error) {
        handleApiError(error);
    }
};

// --- Video Generation Service ---
export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', image?: { data: string, mimeType: string }): Promise<Operation> => {
    const client = getClient(import.meta.env.VITE_API_KEY); // Must create new client for fresh key
    try {
        const operation = await client.models.generateVideos({
            model: videoGenModel,
            prompt: prompt,
            ...(image && { image: { imageBytes: image.data, mimeType: image.mimeType } }),
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio,
            }
        });
        return operation;
    } catch (error) {
        handleApiError(error);
    }
};

export const getVideosOperation = async (operation: Operation): Promise<Operation> => {
    const client = getClient(import.meta.env.VITE_API_KEY); // Must create new client for fresh key
    try {
        const updatedOperation = await client.operations.getVideosOperation({ operation });
        return updatedOperation;
    } catch (error) {
        handleApiError(error);
    }
};

// --- TTS Service ---
export const generateSpeech = async (text: string): Promise<string> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: ttsModel,
            contents: [{ parts: [{ text: text }] }],
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
    } catch (error) {
        handleApiError(error);
    }
};

// --- Live Transcription Service ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createAudioBlob(data: Float32Array): Blob {
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
    const client = getClient();
    try {
        const sessionPromise = client.live.connect({
            model: liveModel,
            callbacks: {
                onopen: () => {
                    console.log('Live session opened for transcription.');
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        const isFinal = message.serverContent.turnComplete ?? false;
                        callbacks.onTranscriptionUpdate(text, isFinal);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    callbacks.onError(new Error(e.message || "An unknown live session error occurred."));
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
    } catch (error) {
        handleApiError(error);
    }
};

// --- Live Conversation Service ---
export const startLiveConversation = async (
    callbacks: {
        onAudio: (audioB64: string) => void,
        onTranscription: (text: string, isFinal: boolean) => void,
        onError: (error: Error) => void,
        onClose: () => void
    }
) => {
    const client = getClient();
    try {
        const sessionPromise = client.live.connect({
            model: liveModel,
            callbacks: {
                onopen: () => console.log('Live session opened for conversation.'),
                onmessage: (message: LiveServerMessage) => {
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
                    callbacks.onError(new Error(e.message || "An unknown live session error occurred."));
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
    } catch (error) {
        handleApiError(error);
    }
};
