export interface Course {
  id: number;
  name: string;
  courseCode: string;
}

export interface Assignment {
  id: number;
  title: string;
  courseId: number;
  dueDate: Date;
  description: string;
  points: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  type: 'assignment' | 'quiz' | 'test';
  courseId: number;
}

export enum Page {
  Dashboard = 'Dashboard',
  Courses = 'Courses',
  Calendar = 'Calendar',
  Summarizer = 'Summarizer',
  Notes = 'Notes',
}

export interface AiTutorMessage {
  role: 'user' | 'model';
  text: string;
}

// Fix: Add missing Settings interface export.
export interface Settings {
  canvasUrl: string;
  apiToken: string;
  sampleDataMode: boolean;
}
