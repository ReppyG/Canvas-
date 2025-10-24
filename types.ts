// ============================================================================
// ENHANCED TYPE SYSTEM - ULTIMATE AI STUDY COMPANION
// ============================================================================

// Existing types remain...
export interface Course {
    id: number;
    name: string;
    course_code: string;
}

export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Assignment {
    id: number;
    name: string;
    description: string | null;
    due_at: string | null;
    points_possible: number | null;
    course_id: number;
    courseName: string;
    status: AssignmentStatus;
}

export interface CalendarEvent {
    id: number;
    course_id: number;
    title: string;
    date: Date;
    type: 'assignment' | 'test' | 'quiz';
    courseName?: string;
}

// ============================================================================
// ENHANCED CHAT SYSTEM
// ============================================================================

export interface ChatConversation {
    id: string;
    title: string;
    type: 'personal' | 'group';
    createdAt: string;
    updatedAt: string;
    lastMessage?: string;
    isPinned: boolean;
    category: 'general' | 'assignment' | 'study' | 'archived';
    participants?: string[]; // For group chats
    metadata?: {
        assignmentId?: number;
        courseId?: number;
        tags?: string[];
    };
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    content: string;
    timestamp: string;
    type: 'text' | 'ai_response' | 'system' | 'file';
    metadata?: {
        sources?: GroundingSource[];
        thinking?: string; // Deep thinking mode output
        tokens?: number;
        model?: string;
    };
    reactions?: {
        userId: string;
        emoji: string;
    }[];
    attachments?: {
        type: 'image' | 'document' | 'link';
        url: string;
        name: string;
    }[];
}

// ============================================================================
// AI-GENERATED CONTENT STORAGE
// ============================================================================

export interface SavedAIContent {
    id: string;
    userId: string;
    type: 'summary' | 'notes' | 'study_plan' | 'chat' | 'analysis';
    title: string;
    content: any; // Flexible for different content types
    sourceType?: 'assignment' | 'document' | 'conversation';
    sourceId?: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    isFavorite: boolean;
    metadata?: {
        courseId?: number;
        assignmentId?: number;
        tokensUsed?: number;
        model?: string;
    };
}

// ============================================================================
// KNOWLEDGE BASE SYSTEM
// ============================================================================

export interface KnowledgeEntry {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: 'concept' | 'formula' | 'definition' | 'example' | 'tip';
    courseId?: number;
    tags: string[];
    embedding?: number[]; // For semantic search
    createdAt: string;
    updatedAt: string;
    accessCount: number;
    lastAccessed?: string;
}

// ============================================================================
// AI CONTEXT & MEMORY
// ============================================================================

export interface AIContext {
    userId: string;
    conversationHistory: ChatMessage[];
    userPreferences: {
        learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
        communicationStyle?: 'concise' | 'detailed' | 'socratic';
        difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
        focusAreas?: string[];
    };
    knowledgeGraph: {
        [concept: string]: {
            masteryLevel: number; // 0-100
            relatedConcepts: string[];
            lastReviewed: string;
        };
    };
    activeGoals: {
        id: string;
        description: string;
        deadline?: string;
        progress: number;
    }[];
}

// ============================================================================
// STUDY SESSION TRACKING
// ============================================================================

export interface StudySession {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    duration?: number; // minutes
    type: 'focus' | 'review' | 'practice' | 'ai_tutoring';
    courseId?: number;
    assignmentId?: number;
    topics: string[];
    effectiveness?: number; // 1-5 rating
    notes?: string;
    aiInteractions: number;
}

// ============================================================================
// SMART NOTIFICATIONS
// ============================================================================

export interface SmartNotification {
    id: string;
    userId: string;
    type: 'deadline' | 'recommendation' | 'achievement' | 'reminder';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: string;
    scheduledFor?: string;
    isRead: boolean;
    actionUrl?: string;
    metadata?: any;
}

// ============================================================================
// AI STUDY PLAN (Enhanced)
// ============================================================================

export interface StudyPlanStep {
    order: number;
    title: string;
    description: string;
    estimatedMinutes: number;
    priority: 'high' | 'medium' | 'low';
    resources: string[];
    completed: boolean;
    completedAt?: string;
    actualMinutes?: number;
    difficulty?: number; // User feedback
}

export interface StudyPlanMilestone {
    name: string;
    completionPercentage: number;
    description: string;
    completed: boolean;
    completedAt?: string;
}

export interface StudyPlan {
    id: string;
    userId: string;
    assignmentId: number;
    title: string;
    estimatedHours: number;
    actualHours?: number;
    steps: StudyPlanStep[];
    milestones: StudyPlanMilestone[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    effectiveness?: number; // User rating
}

// ============================================================================
// SUMMARY (Enhanced)
// ============================================================================

export interface SummaryKeyPoint {
    concept: string;
    explanation: string;
    importance: 'critical' | 'important' | 'supplementary';
}

export interface SummaryDefinition {
    term: string;
    definition: string;
}

export interface Summary {
    id: string;
    userId: string;
    title: string;
    mainTopics: string[];
    keyPoints: SummaryKeyPoint[];
    definitions: SummaryDefinition[];
    examples: string[];
    studyTips: string[];
    createdAt: string;
    sourceType?: string;
    sourceId?: string;
}

// ============================================================================
// AI CHAT TYPES (Enhanced)
// ============================================================================

export interface GroundingSource {
    type: 'web' | 'map' | 'document' | 'knowledge_base';
    uri: string;
    title: string;
    relevance?: number;
}

export interface AiTutorMessage {
    role: 'user' | 'model';
    text: string;
    sources?: GroundingSource[];
    thinking?: string;
    timestamp?: string;
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

export interface UserProgress {
    userId: string;
    totalStudyTime: number; // minutes
    assignmentsCompleted: number;
    coursesActive: number;
    aiInteractions: number;
    knowledgeEntries: number;
    currentStreak: number; // days
    longestStreak: number;
    achievements: Achievement[];
    weeklyGoal?: number; // minutes
    weeklyProgress: number;
}

export interface Achievement {
    id: string;
    type: 'study_streak' | 'assignments' | 'ai_usage' | 'knowledge' | 'milestone';
    title: string;
    description: string;
    unlockedAt: string;
    icon?: string;
}

// ============================================================================
// SETTINGS (Enhanced)
// ============================================================================

export interface Settings {
    canvasUrl: string;
    apiToken: string;
    sampleDataMode: boolean;
    aiPreferences: {
        defaultModel: 'flash' | 'pro';
        enableThinking: boolean;
        enableWebSearch: boolean;
        responseStyle: 'concise' | 'detailed' | 'balanced';
        tutorPersonality: 'professional' | 'friendly' | 'motivational';
    };
    notificationPreferences: {
        email: boolean;
        push: boolean;
        deadlineReminders: boolean;
        studyReminders: boolean;
        aiSuggestions: boolean;
    };
    privacySettings: {
        saveConversations: boolean;
        shareAnonymousData: boolean;
    };
}

// ============================================================================
// APP STATE
// ============================================================================

export enum Page {
    Dashboard,
    Courses,
    Assignments,
    Calendar,
    AiTools,
    Chat,
    Notes,
    Integrations,
    Settings,
    KnowledgeBase,
    StudySessions,
    Progress
}

// ============================================================================
// WINDOW TYPES
// ============================================================================

declare global {
    interface ImportMetaEnv {
        readonly VITE_FIREBASE_API_KEY: string;
        readonly VITE_FIREBASE_AUTH_DOMAIN: string;
        readonly VITE_FIREBASE_PROJECT_ID: string;
        readonly VITE_FIREBASE_STORAGE_BUCKET: string;
        readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
        readonly VITE_FIREBASE_APP_ID: string;
        readonly VITE_FIREBASE_MEASUREMENT_ID: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }

    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
        webkitAudioContext: typeof AudioContext;
    }
}
