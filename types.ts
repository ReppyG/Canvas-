// This file defines the core data structures for the Student Platform application.

// Canvas API related types
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
    courseName: string; // Enriched in the app
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

// AI Study Plan types
export interface StudyPlanStep {
    order: number;
    title: string;
    description: string;
    estimatedMinutes: number;
    priority: 'high' | 'medium' | 'low';
    resources: string[];
    completed: boolean; // For UI state
}

export interface StudyPlanMilestone {
    name: string;
    completionPercentage: number;
    description: string;
}

export interface StudyPlan {
    title: string;
    estimatedHours: number;
    steps: StudyPlanStep[];
    milestones: StudyPlanMilestone[];
}

// AI Summarizer types
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
    title: string;
    mainTopics: string[];
    keyPoints: SummaryKeyPoint[];
    definitions: SummaryDefinition[];
    examples: string[];
    studyTips: string[];
}

// AI Tutor Chat types
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface GroundingSource {
    type: 'web' | 'map';
    uri: string;
    title: string;
}

export interface AiTutorMessage {
    role: 'user' | 'model';
    text: string;
    sources?: GroundingSource[];
}

// Note taking types
export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

// User-to-user Chat types
export interface UserChatMessage {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: string;
}

export interface ConversationSummary {
    peerId: string;
    lastMessage: string;
    timestamp: string;
}

// App related types
export enum Page {
    Dashboard,
    Courses,
    Assignments,
    Calendar,
    AiTools,
    Chat,
    Notes,
    Integrations,
    Settings
}

export interface Settings {
    canvasUrl: string;
    apiToken: string;
    sampleDataMode: boolean;
}

// Add aistudio to the window object for type safety
// Fix: Define and use an explicit `AIStudio` interface to resolve conflicting global type declarations.

// Fix for line 146: Moved AIStudio interface into `declare global` to resolve conflicting global type declarations error.
// Fix: Add global type declarations for `import.meta.env` to resolve TypeScript errors when accessing Vite environment variables.
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
