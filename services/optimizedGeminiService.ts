/**
 * OPTIMIZED GEMINI SERVICE - FREE TIER ONLY
 * Removes all paid features and implements intelligent caching & batching
 * 
 * REMOVED FEATURES (Paid only):
 * - Veo Video Generation (requires billing)
 * - Imagen 4.0 Image Generation (requires billing)
 * - Gemini 2.5 Pro with extended thinking (high cost)
 * 
 * OPTIMIZED FEATURES:
 * - Smart response caching
 * - Request batching
 * - Token usage optimization
 * - Free tier models only
 */

import { Assignment, StudyPlan, Summary, ChatMessage } from '../types';

// ============================================================================
// CONFIGURATION - FREE TIER MODELS ONLY
// ============================================================================

const FREE_MODELS = {
    flash: 'gemini-2.5-flash',           // Fast, free, efficient
    flashLite: 'gemini-flash-lite-latest', // Ultra-fast for simple tasks
};

// ============================================================================
// SMART CACHING SYSTEM
// ============================================================================

interface CacheEntry {
    data: any;
    timestamp: number;
    expiresAt: number;
}

class SmartCache {
    private cache = new Map<string, CacheEntry>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }

    set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
        });
    }

    clear() {
        this.cache.clear();
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

const cache = new SmartCache();

// Auto-cleanup every 10 minutes
setInterval(() => cache.cleanup(), 10 * 60 * 1000);

// ============================================================================
// PROXY CALL OPTIMIZATION
// ============================================================================

interface RequestQueueItem {
    action: string;
    payload: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

class RequestBatcher {
    private queue: RequestQueueItem[] = [];
    private processing = false;
    private readonly BATCH_DELAY = 100; // ms
    private readonly MAX_BATCH_SIZE = 5;

    async add(action: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ action, payload, resolve, reject });
            this.scheduleProcess();
        });
    }

    private scheduleProcess() {
        if (this.processing) return;
        
        setTimeout(() => this.process(), this.BATCH_DELAY);
    }

    private async process() {
        if (this.queue.length === 0) return;
        
        this.processing = true;
        const batch = this.queue.splice(0, this.MAX_BATCH_SIZE);
        
        // Process batch in parallel
        await Promise.allSettled(
            batch.map(async (item) => {
                try {
                    const result = await this.executeRequest(item.action, item.payload);
                    item.resolve(result);
                } catch (error) {
                    item.reject(error);
                }
            })
        );
        
        this.processing = false;
        
        if (this.queue.length > 0) {
            this.scheduleProcess();
        }
    }

    private async executeRequest(action: string, payload: any): Promise<any> {
        const response = await fetch('/api/gemini-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'AI service error');
        }
        
        return response.json();
    }
}

const batcher = new RequestBatcher();

// ============================================================================
// OPTIMIZED API FUNCTIONS
// ============================================================================

/**
 * Generate text with smart caching
 */
export const generateText = async (prompt: string, useCache = true): Promise<string> => {
    if (useCache) {
        const cacheKey = `text:${prompt.slice(0, 100)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;
        
        const result = await batcher.add('generateText', { prompt });
        cache.set(cacheKey, result.text);
        return result.text;
    }
    
    const result = await batcher.add('generateText', { prompt });
    return result.text;
};

/**
 * Summarize document with intelligent chunking
 */
export const summarizeDocument = async (content: string): Promise<string> => {
    // Check cache first
    const cacheKey = `summary:${content.slice(0, 200)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    // If content is too long, chunk it intelligently
    const MAX_CHUNK_SIZE = 8000; // characters
    if (content.length > MAX_CHUNK_SIZE) {
        const chunks = chunkText(content, MAX_CHUNK_SIZE);
        const summaries = await Promise.all(
            chunks.map(chunk => batcher.add('summarizeDocument', { content: chunk }))
        );
        
        // Combine summaries
        const combined = summaries.map(s => s.text).join('\n\n');
        
        // Final summary of summaries
        const finalResult = await batcher.add('summarizeDocument', { content: combined });
        cache.set(cacheKey, finalResult.text);
        return finalResult.text;
    }
    
    const result = await batcher.add('summarizeDocument', { content });
    cache.set(cacheKey, result.text);
    return result.text;
};

/**
 * Generate study notes with caching
 */
export const generateNotesFromText = async (content: string): Promise<string> => {
    const cacheKey = `notes:${content.slice(0, 200)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await batcher.add('generateNotes', { content });
    cache.set(cacheKey, result.text, 30 * 60 * 1000); // 30 min cache
    return result.text;
};

/**
 * Estimate assignment time with caching
 */
export const estimateAssignmentTime = async (assignment: Assignment): Promise<string> => {
    const cacheKey = `time:${assignment.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await batcher.add('estimateTime', {
        assignmentName: assignment.name,
        description: assignment.description || 'No description',
        points: assignment.points_possible || 'N/A'
    });
    
    cache.set(cacheKey, result.text, 60 * 60 * 1000); // 1 hour cache
    return result.text;
};

/**
 * Generate grounded text (web search enabled)
 */
export const generateGroundedText = async (
    prompt: string
): Promise<{ text: string; sources: any[] }> => {
    const result = await batcher.add('generateGroundedText', { prompt });
    return {
        text: result.text,
        sources: result.sources || []
    };
};

// ============================================================================
// STUDY PLAN GENERATION (Optimized)
// ============================================================================

export const generateStudyPlan = async (assignment: Assignment): Promise<StudyPlan> => {
    // Check cache
    const cacheKey = `plan:${assignment.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    // Use Flash model for speed (not Pro for cost savings)
    const daysUntilDue = assignment.due_at 
        ? Math.ceil((new Date(assignment.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
        : 7;

    const prompt = `Create a study plan for this assignment (respond with JSON only):
Assignment: ${assignment.name}
Course: ${assignment.courseName}
Days until due: ${daysUntilDue}
Description: ${assignment.description?.slice(0, 500) || 'No description'}
Points: ${assignment.points_possible || 'N/A'}

Return JSON with: title, estimatedHours, steps (array with: order, title, description, estimatedMinutes, priority, resources), milestones (array with: name, completionPercentage, description)`;

    const result = await batcher.add('generateStructuredPlan', { prompt });
    
    try {
        const plan = JSON.parse(result.text);
        const studyPlan: StudyPlan = {
            id: `plan_${assignment.id}_${Date.now()}`,
            userId: 'current_user', // Will be set by calling component
            assignmentId: assignment.id,
            ...plan,
            createdAt: new Date().toISOString(),
        };
        
        cache.set(cacheKey, studyPlan, 24 * 60 * 60 * 1000); // 24 hour cache
        return studyPlan;
    } catch (error) {
        console.error('Failed to parse study plan:', error);
        throw new Error('Failed to generate study plan. Please try again.');
    }
};

// ============================================================================
// CHAT FUNCTIONS (Optimized)
// ============================================================================

let chatHistoryCache = new Map<string, ChatMessage[]>();

export const getChatResponse = async (
    conversationId: string,
    message: string,
    history: ChatMessage[],
    enableWebSearch: boolean = false
): Promise<{ text: string; sources?: any[] }> => {
    // Limit history to last 10 messages for cost optimization
    const recentHistory = history.slice(-10);
    
    const historyText = recentHistory
        .map(m => `${m.senderName}: ${m.content}`)
        .join('\n\n');
    
    const fullPrompt = `${historyText}\n\nUser: ${message}`;
    
    if (enableWebSearch) {
        return await generateGroundedText(fullPrompt);
    }
    
    const result = await generateText(fullPrompt, false); // Don't cache chat responses
    return { text: result };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Intelligently chunk text while preserving context
 */
function chunkText(text: string, maxSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');
    
    let currentChunk = '';
    
    for (const para of paragraphs) {
        if ((currentChunk + para).length > maxSize) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export const clearCache = () => {
    cache.clear();
    chatHistoryCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    return {
        cacheSize: cache['cache'].size,
        chatHistorySize: chatHistoryCache.size,
    };
};

// ============================================================================
// TOKEN USAGE OPTIMIZATION
// ============================================================================

/**
 * Estimate token count (rough approximation)
 */
export const estimateTokens = (text: string): number => {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
};

/**
 * Optimize prompt to reduce tokens
 */
export const optimizePrompt = (prompt: string, maxTokens: number = 1000): string => {
    const currentTokens = estimateTokens(prompt);
    
    if (currentTokens <= maxTokens) return prompt;
    
    // Reduce to fit within limit
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(prompt.length * ratio * 0.9); // 90% to be safe
    
    return prompt.slice(0, targetLength) + '...';
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    generateText,
    summarizeDocument,
    generateNotesFromText,
    estimateAssignmentTime,
    generateGroundedText,
    generateStudyPlan,
    getChatResponse,
    clearCache,
    getCacheStats,
    estimateTokens,
    optimizePrompt,
};
