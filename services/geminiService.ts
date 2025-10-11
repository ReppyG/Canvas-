import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Create a singleton instance that is initialized lazily to prevent app crash on load.
let ai: GoogleGenAI | null = null;
const model = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
    if (ai) {
        return ai;
    }
    
    // Vite exposes environment variables on the `import.meta.env` object.
    // Variables must be prefixed with `VITE_` to be exposed to the client.
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please set the VITE_API_KEY environment variable.");
    }
    ai = new GoogleGenAI({ apiKey });
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
    if (error instanceof Error) {
        // Catch the specific "not configured" error from getClient()
        if (error.message.includes('not configured')) {
             return `[AI Error] ${error.message}`;
        }
        // Catch errors from the SDK which may indicate an invalid key
        if (error.message.includes('API key')) {
             return `[AI Error] Invalid API Key: Please ensure your Gemini API key is configured correctly in your deployment settings. The application was unable to authenticate with the provided credentials.`;
        }
        return `[AI Error] An unexpected error occurred: ${error.message}`;
    }
    return "[AI Error] An unknown error occurred while communicating with the AI. Please check your network connection and API key.";
  }
};

export const summarizeDocument = async (fileContent: string): Promise<string> => {
    const prompt = `Summarize the following document into key bullet points and a concise concluding paragraph. Here is the document content:\n\n${fileContent}`;
    return generateText(prompt);
};

export const generateNotesFromText = async (text: string): Promise<string> => {
    const prompt = `Act as an expert academic assistant. Generate a comprehensive, well-structured study guide in markdown format from the following text. The guide should be easy to read and help a student learn the material effectively.

Your study guide should include the following sections:
- **Executive Summary:** A brief, high-level overview of the entire text.
- **Key Concepts:** A bulleted list of the most important concepts, terms, or topics, each with a concise explanation.
- **Main Points:** A more detailed breakdown of the main arguments or sections from the text, using nested bullet points for clarity.
- **Potential Quiz Questions:** A list of 3-5 questions that would test someone's understanding of the material.

Ensure the formatting is clean and uses markdown elements like headings (#, ##), bold text (**), and lists (-) appropriately.

Here is the text to analyze:
---
${text}
---`;
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