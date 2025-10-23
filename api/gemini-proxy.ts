import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import the types you need
import { 
    GoogleGenAI, 
    GenerateContentResponse, 
    FinishReason 
} from '@google/genai';

// Rate limiting configuration (SEE NOTE IN SECTION 3)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 * WARNING: This will NOT work reliably on Vercel.
 */
function checkRateLimit(identifier: string): boolean {
    // ... (Your existing function)
}

/**
 * Validates the request payload
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
    // ... (Your existing function)
}

/**
 * Sanitizes user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
    // ... (Your existing function)
}

// ==================================================================
// 💡 NEW HELPER FUNCTION: THE CRITICAL FIX
// ==================================================================
/**
 * Safely extracts text from a Gemini response,
 * preventing crashes on safety blocks or empty responses.
 */
function getSafeResponseText(response: GenerateContentResponse): string {
    try {
        // Check for safety blocks or other non-OK finish reasons
        if (!response.candidates || response.candidates.length === 0) {
            console.warn('Gemini response had no candidates.');
            return '[No response from AI]';
        }

        const finishReason = response.candidates[0].finishReason;
        if (
            finishReason === FinishReason.SAFETY ||
            finishReason === FinishReason.RECITATION ||
            finishReason === FinishReason.OTHER
        ) {
            console.warn(`Gemini generation stopped for reason: ${finishReason}`);
            return `[Content generation blocked: ${finishReason}]`;
        }

        // If it's STOP or MAX_TOKENS, text() is safe to call
        return response.text();

    } catch (e) {
        console.error('Error in getSafeResponseText:', e);
        return '[Error processing AI response]';
    }
}
// ==================================================================

/**
 * Main proxy handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers - 💡 IMPROVED LOGIC
    const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    if (process.env.VERCEL_URL) {
        // This covers the specific deployment URL
        allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        // This covers the main production domain
        allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // ... (Your existing headers, OPTIONS check, POST check)

    // ... (Your existing rate limiting check)
    
    // ... (Your existing validation check)
    
    const { action, payload } = req.body;
    
    // ... (Your existing API key check)
    
    try {
        // This dynamic import is correct
        const { GoogleGenAI } = await import('@google/genai');
        const client = new GoogleGenAI({ apiKey: apiKey! });
        
        let result: any;
        
        // This assumes your client.models.generateContent returns Promise<GenerateContentResponse>
        // If it returns Promise<GenerateContentResult>, change 'response' to 'response.response'
        
        switch (action) {
            case 'generateText':
                {
                    const { prompt } = payload;
                    const sanitizedPrompt = sanitizeInput(prompt);
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: sanitizedPrompt,
                    });
                    
                    // ✅ FIXED
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'summarizeDocument':
                {
                    const { content, enableThinking } = payload;
                    const sanitizedContent = sanitizeInput(content);
                    
                    const config: any = {};
                    if (enableThinking) {
                        config.thinkingConfig = { thinkingBudget: 32768 };
                    }
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-pro',
                        contents: `Summarize this document concisely:\n\n${sanitizedContent}`,
                        config,
                    });
                    
                    // ✅ FIXED
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'generateNotes':
                {
                    const { content, enableThinking } = payload;
                    const sanitizedContent = sanitizeInput(content);
                    
                    const config: any = {};
                    if (enableThinking) {
                        config.thinkingConfig = { thinkingBudget: 32768 };
                    }
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-pro',
                        contents: `Create a structured study guide from this text:\n\n${sanitizedContent}`,
                        config,
                    });
                    
                    // ✅ FIXED
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'estimateTime':
                {
                    const { assignmentName, description, points } = payload;
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-flash-lite-latest',
                        contents: `Estimate time to complete this assignment. Respond with just the estimate (e.g., "2-3 hours"):\nName: ${assignmentName}\nDescription: ${description}\nPoints: ${points}`,
                    });
                    
                    // ✅ FIXED
                    result = { text: getSafeResponseText(genAIResponse).trim() };
                }
                break;
                
            case 'generateGroundedText':
                {
                    const { prompt } = payload;
                    const sanitizedPrompt = sanitizeInput(prompt);
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: sanitizedPrompt,
                        config: {
                            tools: [{ googleSearch: {} }, { googleMaps: {} }],
                        },
                    });
                    
                    // ✅ FIXED
                    const text = getSafeResponseText(genAIResponse);
                    
                    const groundingChunks = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                    
                    const sources = groundingChunks
                        .map((chunk: any) => {
                            // ... (your existing map logic is fine)
                        })
                        .filter((s: any) => s && s.uri);
                    
                    const uniqueSources = Array.from(
                        new Map(sources.map((s: any) => [s.uri, s])).values()
                    );
                    
                    result = { text, sources: uniqueSources };
                }
                break;
                
            default:
                return res.status(400).json({ error: 'Action not implemented' });
        }
        
        return res.status(200).json(result);
        
    } catch (error) {
        // ... (Your existing error handler is good)
    }
}
