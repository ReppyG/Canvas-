
import { Course, Assignment, CalendarEvent } from '../types';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);
const twoWeeks = new Date(today);
twoWeeks.setDate(today.getDate() + 14);

const courses: Course[] = [
  { id: 1, name: 'Introduction to Artificial Intelligence', courseCode: 'CS-101' },
  { id: 2, name: 'Modern Web Development', courseCode: 'WEB-202' },
  { id: 3, name: 'Data Structures & Algorithms', courseCode: 'CS-210' },
];

const assignments: Assignment[] = [
  { id: 1, courseId: 1, title: 'Essay on Turing Test', dueDate: tomorrow, points: 100, description: 'Write a 1500-word essay discussing the history, significance, and modern implications of the Turing Test in artificial intelligence.' },
  { id: 2, courseId: 2, title: 'React SPA Project', dueDate: nextWeek, points: 150, description: 'Build a single-page application using React, TypeScript, and Tailwind CSS. The application should fetch data from a public API and display it in a user-friendly interface.' },
  { id: 3, courseId: 3, title: 'Binary Search Tree Implementation', dueDate: twoWeeks, points: 120, description: 'Implement a binary search tree in Python with methods for insertion, deletion, and traversal (in-order, pre-order, post-order).' },
  { id: 4, courseId: 1, title: 'Machine Learning Concepts Quiz', dueDate: nextWeek, points: 50, description: 'A short quiz covering the fundamental concepts of supervised vs. unsupervised learning.' },
];

const calendarEvents: CalendarEvent[] = [
  { id: 1, courseId: 1, title: 'AI Essay Due', date: tomorrow, type: 'assignment' },
  { id: 2, courseId: 2, title: 'React Project Due', date: nextWeek, type: 'assignment' },
  { id: 3, courseId: 3, title: 'Mid-term Exam', date: twoWeeks, type: 'test' },
  { id: 4, courseId: 1, title: 'ML Quiz Due', date: nextWeek, type: 'quiz'},
];

const mockApiCall = <T,>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(data), 500));
}

export const getCourses = (): Promise<Course[]> => mockApiCall(courses);
export const getAssignments = (): Promise<Assignment[]> => mockApiCall(assignments);
export const getCalendarEvents = (): Promise<CalendarEvent[]> => mockApiCall(calendarEvents);