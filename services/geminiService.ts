import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Create a singleton instance that is initialized lazily to prevent app crash on load.
let ai: GoogleGenAI | null = null;
const model = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
    if (ai) {
        return ai;
    }
    
    // This check prevents a hard crash if the API_KEY is not set.
    // The error will be caught by the calling functions that use this client.
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key is not configured. Please set the API_KEY environment variable in your deployment settings.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
}


export const generateText = async (prompt: string): Promise<string> => {
  try {
    const client = getClient();
    const response: GenerateContentResponse = await client.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    return "An error occurred while communicating with the AI. Please check your API key and try again.";
  }
};

export const summarizeDocument = async (fileContent: string): Promise<string> => {
    const prompt = `Summarize the following document into key bullet points and a concise concluding paragraph. Here is the document content:\n\n${fileContent}`;
    return generateText(prompt);
};

export const generateNotesFromText = async (text: string): Promise<string> => {
    const prompt = `As an expert note-taker, generate concise, well-structured notes in markdown format based on the following text. Focus on identifying key concepts, definitions, main arguments, and important examples. Use headings, bullet points, and bold text to organize the information effectively.\n\nText:\n${text}`;
    return generateText(prompt);
};

export const estimateAssignmentTime = async (assignment: { title: string; description: string }): Promise<string> => {
    const prompt = `As an expert academic planner, estimate the time required for a typical university student to complete this assignment. Provide a realistic time range (e.g., 3-5 hours). Consider the title and description.\n\nTitle: ${assignment.title}\n\nDescription: ${assignment.description}`;
    return generateText(prompt);
};


export const getAssignmentHelp = async (assignment: { title: string; description: string }): Promise<string> => {
    const prompt = `As a helpful teaching assistant, provide guidance, key concepts to research, and a possible structure to approach the following assignment. Do not write the assignment or provide direct answers. Focus on empowering the student to learn.\n\nTitle: ${assignment.title}\n\nDescription: ${assignment.description}`;
    return generateText(prompt);
};

export const generateNotes = async (assignment: { title: string; description: string }): Promise<string> => {
    const prompt = `As an expert note-taker, generate concise, well-structured notes in markdown format based on the key topics in this assignment description. Focus on definitions, key concepts, and important questions to consider.\n\nTitle: ${assignment.title}\n\nDescription: ${assignment.description}`;
    return generateText(prompt);
}

export const createTutorChat = (assignment: { title: string; description: string }): Chat | null => {
    try {
        const client = getClient();
        return client.chats.create({
            model,
            config: {
                systemInstruction: `You are an encouraging and knowledgeable AI tutor. Your goal is to help the student understand the concepts behind their assignment and guide them to the solution, not to give them the answer directly. Ask guiding questions, break down complex topics, and explain things clearly. The student is working on the following assignment:\n\nTitle: ${assignment.title}\n\nDescription: ${assignment.description}`,
            },
        });
    } catch(error) {
        console.error("Failed to create tutor chat:", error);
        return null;
    }
};