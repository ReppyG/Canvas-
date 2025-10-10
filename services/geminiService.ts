import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// IMPORTANT: This is a temporary fix for local development.
// The browser does not have access to `process.env`.
// In a real, deployed application, this key should be handled by a secure backend proxy,
// not exposed in the frontend code.
const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // <-- REPLACE THIS WITH YOUR ACTUAL KEY

if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
  // In a real app, you might want to show an error to the user or handle this differently.
  // For this example, we'll log an error.
  console.error("Gemini API key not found. Please replace the placeholder in services/geminiService.ts.");
}

// Initialize with a placeholder if the key is missing to avoid crashing.
const ai = new GoogleGenAI({ apiKey: API_KEY || "invalid-key" });
const model = "gemini-2.5-flash";

export const generateText = async (prompt: string): Promise<string> => {
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") return "API Key not configured. Please add it in services/geminiService.ts";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    return "An error occurred while communicating with the AI. Check if your API key is valid.";
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

export const createTutorChat = (assignment: { title: string; description: string }): Chat => {
    return ai.chats.create({
        model,
        config: {
            systemInstruction: `You are an encouraging and knowledgeable AI tutor. Your goal is to help the student understand the concepts behind their assignment and guide them to the solution, not to give them the answer directly. Ask guiding questions, break down complex topics, and explain things clearly. The student is working on the following assignment:\n\nTitle: ${assignment.title}\n\nDescription: ${assignment.description}`,
        },
    });
};