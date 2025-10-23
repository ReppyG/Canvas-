import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
    GoogleGenAI, 
    GenerateContentResponse, 
    FinishReason 
} from '@google/genai';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar
 */
function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = requestCounts.get(identifier);
    
    if (!record || now > record.resetTime) {
        requestCounts.set(identifier, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        });
        return true;
    }
    
    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    
    record.count++;
    return true;
}

/**
 * Validates the request payload
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body' };
    }
    
    const { action, payload } = body;
    
    if (!action || typeof action !== 'string') {
        return { valid: false, error: 'Missing or invalid action' };
    }
    
    const validActions = [
        'generateStudyPlan',
        'generateSummary',
        'getTutorResponse',
        'generateText',
        'summarizeDocument',
        'generateNotes',
        'estimateTime',
        'analyzeImage',
        'analyzeVideo',
        'generateGroundedText'
    ];
    
    if (!validActions.includes(action)) {
        return { valid: false, error: `Invalid action: ${action}` };
    }
    
    if (!payload) {
        return { valid: false, error: 'Missing payload' };
    }
    
    return { valid: true };
}

/**
 * Sanitizes user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
    // Remove potential prompt injection attempts
    const dangerous = [
        'ignore previous',
        'ignore all',
        'forget everything',
        'new instructions',
        'system message',
        'you are now',
        '<|endoftext|>',
        '<|im_start|>',
        '<|im_end|>'
    ];
    
    let sanitized = input;
    dangerous.forEach(phrase => {
        const regex = new RegExp(phrase, 'gi');
        sanitized = sanitized.replace(regex, '');
    });
    
    // Limit length to prevent abuse
    return sanitized.slice(0, 10000);
}

/**
 * Safely extracts text from a Gemini response,
 * preventing crashes on safety blocks or empty responses.
 *
 * 💡 FIXED: Now uses the .text PROPERTY, not the .text() function.
 */
function getSafeResponseText(response: GenerateContentResponse): string {
    try {
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

        // 💡 THE FIX: Access the .text property (which can be undefined)
        // and provide a fallback.
        const text = response.text; // This was the original error TS18048
        
        return text ?? '[No text in response]'; // Handle undefined/null

    } catch (e) {
        console.error('Error in getSafeResponseText:', e);
        return '[Error processing AI response]';
    }
}

/**
 * Main proxy handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    const origin = req.headers.origin;
    const allowedOrigins = process.env.VERCEL_URL 
        ? [
            `https://${process.env.VERCEL_URL}`,
            process.env.VERCEL_ENV === 'production' 
                ? process.env.PRODUCTION_URL 
                : undefined
          ].filter(Boolean)
        : ['http://localhost:5173', 'http://127.0.0.1:5173'];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Rate limiting
    const identifier = `${req.headers['x-forwarded-for'] || 'unknown'}-${req.headers['user-agent'] || 'unknown'}`;
    if (!checkRateLimit(identifier)) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded. Please wait before making more requests.' 
        });
    }
    
    // Validate request
    const validation = validateRequest(req.body);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }
    
    const { action, payload } = req.body;
    
    // 💡 FIXED: 'apiKey' definition is restored here
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ 
            error: 'AI service not configured. Please contact support.' 
        });
    }
    
    try {
        const { GoogleGenAI } = await import('@google/genai');
        
        // 💡 FIXED: Pass the 'apiKey' variable correctly
        const client = new GoogleGenAI({ apiKey });
        
        let result: any;
        
        switch (action) {
            case 'generateText':
                {
                    const { prompt } = payload;
                    const sanitizedPrompt = sanitizeInput(prompt);
                    
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: sanitizedPrompt,
                    });
                    
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
                    
                   // This is CORRECT
                    const genAIResponse = await client.models.generateContent({
                        model: 'gemini-2.5-pro',
                        contents: `Summarize this document concisely:\n\n${sanitizedContent}`,
                        config,
                    });
                    
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
                    
                    const text = getSafeResponseText(genAIResponse);
                    const groundingChunks = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                    
                    const sources = groundingChunks
                        .map((chunk: any) => {
                            if (chunk.web) return { 
                                type: 'web', 
                                uri: chunk.web.uri || '', 
                                title: chunk.web.title || 'Untitled' 
                            };
                            if (chunk.maps) return { 
                                type: 'map', 
                                uri: chunk.maps.uri || '', 
                                title: chunk.maps.title || 'Untitled Place' 
                            };
                            return null;
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
        console.error('Gemini API error:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                return res.status(500).json({ 
                    error: 'AI service authentication failed' 
                });
            }
            if (error.message.includes('RESOURCE_EXHAUSTED')) {
                return res.status(429).json({ 
                    error: 'AI service rate limit exceeded. Please try again later.' 
                });
            }
        }
        
        return res.status(500).json({ 
            error: 'An error occurred while processing your request' 
        });
    }
}
