import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
    GoogleGenerativeAI, 
    GenerateContentResult,
    HarmCategory,
    HarmBlockThreshold
} from '@google/generative-ai';

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
 * Safely extracts text from a Gemini response
 */
function getSafeResponseText(response: GenerateContentResult): string {
    try {
        if (!response.response) {
            console.warn('Gemini response had no response object.');
            return '[No response from AI]';
        }

        const candidates = response.response.candidates;
        if (!candidates || candidates.length === 0) {
            console.warn('Gemini response had no candidates.');
            return '[No response from AI]';
        }

        const finishReason = candidates[0].finishReason;
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
            console.warn(`Gemini generation stopped for reason: ${finishReason}`);
            return `[Content generation blocked: ${finishReason}]`;
        }

        const text = response.response.text();
        return text || '[No text in response]';

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
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ 
            error: 'AI service not configured. Please contact support.' 
        });
    }
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        let result: any;
        
        switch (action) {
            case 'generateText':
                {
                    const { prompt } = payload;
                    const sanitizedPrompt = sanitizeInput(prompt);
                    
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
                    const genAIResponse = await model.generateContent(sanitizedPrompt);
                    
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'summarizeDocument':
                {
                    const { content } = payload;
                    const sanitizedContent = sanitizeInput(content);
                    
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
                    const genAIResponse = await model.generateContent(
                        `Summarize this document concisely:\n\n${sanitizedContent}`
                    );
                    
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'generateNotes':
                {
                    const { content } = payload;
                    const sanitizedContent = sanitizeInput(content);
                    
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
                    const genAIResponse = await model.generateContent(
                        `Create a structured study guide from this text:\n\n${sanitizedContent}`
                    );
                    
                    result = { text: getSafeResponseText(genAIResponse) };
                }
                break;
                
            case 'estimateTime':
                {
                    const { assignmentName, description, points } = payload;
                    
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
                    const genAIResponse = await model.generateContent(
                        `Estimate time to complete this assignment. Respond with just the estimate (e.g., "2-3 hours"):\nName: ${assignmentName}\nDescription: ${description}\nPoints: ${points}`
                    );
                    
                    result = { text: getSafeResponseText(genAIResponse).trim() };
                }
                break;
                
            case 'generateGroundedText':
                {
                    const { prompt } = payload;
                    const sanitizedPrompt = sanitizeInput(prompt);
                    
                    const model = genAI.getGenerativeModel({ 
                        model: 'gemini-2.0-flash-exp',
                        tools: [{ googleSearchRetrieval: {} }]
                    });
                    
                    const genAIResponse = await model.generateContent(sanitizedPrompt);
                    const text = getSafeResponseText(genAIResponse);
                    
                    // Extract grounding metadata if available
                    const groundingMetadata = genAIResponse.response?.candidates?.[0]?.groundingMetadata;
                    const sources: any[] = [];
                    
                    if (groundingMetadata?.groundingChunks) {
                        groundingMetadata.groundingChunks.forEach((chunk: any) => {
                            if (chunk.web) {
                                sources.push({
                                    type: 'web',
                                    uri: chunk.web.uri || '',
                                    title: chunk.web.title || 'Untitled'
                                });
                            }
                        });
                    }
                    
                    result = { text, sources };
                }
                break;
                
            default:
                return res.status(400).json({ error: 'Action not implemented' });
        }
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('Gemini API error:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('API key') || error.message.includes('API_KEY')) {
                return res.status(500).json({ 
                    error: 'AI service authentication failed' 
                });
            }
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')) {
                return res.status(429).json({ 
                    error: 'AI service rate limit exceeded. Please try again later.' 
                });
            }
        }
        
        return res.status(500).json({ 
            error: 'An error occurred while processing your request',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
