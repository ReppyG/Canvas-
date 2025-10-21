import { GoogleGenAI, Type, Chat, Connection, LiveServerMessage, Modality, Blob } from "@google/genai";
import { Assignment, StudyPlan, Summary, ChatMessage } from "../types";

let ai: GoogleGenAI | null = null;
const studyPlanModel = "gemini-2.5-pro";
const summaryModel = "gemini-2.5-pro";
const tutorModel = "gemini-flash-lite-latest";

function getClient(): GoogleGenAI {
    if (ai) return ai;
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please set the API_KEY environment variable.");
    }
    ai = new GoogleGenAI({ apiKey });
    return ai;
}

const handleApiError = (error: unknown) : never => {
    console.error("Error communicating with Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key')) {
             throw new Error(`[AI Error] Invalid API Key: Please ensure your Gemini API key is configured correctly.`);
        }
        if (error.message.includes('RESOURCE_EXHAUSTED')) {
            throw new Error(`[AI Error] You have exceeded the API request limit. Please wait a moment before trying again.`);
        }
        throw new Error(`[AI Error] An unexpected error occurred: ${error.message}`);
    }
    throw new Error("[AI Error] An unknown error occurred while communicating with the AI.");
}

interface GenerationOptions {
    enableThinking?: boolean;
}

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
        model: tutorModel,
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
            model: 'gemini-flash-lite-latest',
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
            model: tutorModel,
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
        model: tutorModel,
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
        model: tutorModel,
        config: {
            systemInstruction: `You are a helpful AI assistant for a student. You have access to their course and assignment data to answer questions. Be concise and helpful. Here is the student's data: ${context}`
        },
    });
    return chat;
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
// Fix: Use the correct `Connection` type instead of the removed `LiveSession` type.
): Promise<Connection> => {
    const client = getClient();
    try {
        const sessionPromise = client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    console.log('Live session opened for transcription.');
                },
                onmessage: (message: LiveServerMessage) => {
                    // We only care about the input transcription, ignore any audio output
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
                responseModalities: [Modality.AUDIO], // Required by the API
                inputAudioTranscription: {},
            },
        });
        return sessionPromise;
    } catch (error) {
        handleApiError(error);
    }
};