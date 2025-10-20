// This file defines the core data structures for the Student Platform application.

// Canvas API related types
export interface Course {
    id: number;
    name: string;
    course_code: string;
}

// Fix: Add AssignmentStatus type
export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Assignment {
    id: number;
    name: string;
    description: string | null;
    due_at: string | null;
    points_possible: number | null;
    course_id: number;
    courseName: string; // Enriched in the app
    // Fix: Add status property to Assignment
    status?: AssignmentStatus;
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
    timestamp: Date;
}

// Fix: Add AiTutorMessage for the other UI
export interface AiTutorMessage {
    role: 'user' | 'model';
    text: string;
}

// App related types
export type View = 'setup' | 'dashboard' | 'planner' | 'summarizer' | 'tutor';

export interface CanvasConfig {
    domain: string;
    accessToken: string;
}

// Fix: Add Page enum for the other UI
export enum Page {
    Dashboard,
    Courses,
    Assignments,
    AiTools,
    Chat,
    Integrations,
    Settings
}

// Fix: Add Settings interface for the other UI
export interface Settings {
    canvasUrl: string;
    apiToken: string;
    sampleDataMode: boolean;
}

// Fix: Add CalendarEvent interface for the other UI
export interface CalendarEvent {
    id: number;
    course_id: number;
    title: string;
    date: Date;
    type: 'assignment' | 'test' | 'quiz';
}
