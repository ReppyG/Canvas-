import { useState, useEffect, useCallback } from 'react';
import { Course, Assignment, CalendarEvent, Settings } from '../types';
import * as apiService from '../services/canvasApiService';
import * as mockService from '../services/canvasMockService';
import { storage } from '../services/storageService';

const CANVAS_ASSIGNMENT_IDS_KEY = 'canvasAiAssistantAssignmentIds';

type CanvasService = {
    getCourses: (settings: Settings) => Promise<Course[]>;
    getAssignments: (settings: Settings, courses: Course[]) => Promise<Assignment[]>; // <-- Updated signature
}

type MockCanvasService = {
    getCourses: () => Promise<Course[]>;
    getAssignments: () => Promise<Assignment[]>;
}

export const useCanvasData = (settings: Settings | null, enabled: boolean) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'sample' | 'error'>('live');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setNewAssignments([]);
      
      const useSampleData = settings?.sampleDataMode ?? false;
      
      setConnectionStatus(useSampleData ? 'sample' : 'live');

      if (!useSampleData && (!settings || !settings.canvasUrl || !settings.apiToken)) {
          setError("Canvas settings not configured.");
          setConnectionStatus('error');
          setLoading(false);
          return;
      }

      // **ARCHITECTURAL FIX**: Implement a clear, sequential data flow.
      // 1. Fetch courses.
      const coursesData = useSampleData 
        ? await (mockService as MockCanvasService).getCourses() 
        : await (apiService as Omit<CanvasService, 'getAssignments'>).getCourses(settings!);

      // 2. Pass the fetched courses to getAssignments.
      const assignmentsData = useSampleData 
        ? await (mockService as MockCanvasService).getAssignments() 
        : await (apiService as CanvasService).getAssignments(settings!, coursesData);
      
      if (!useSampleData && settings) {
          const newAssignmentIds = new Set(assignmentsData.map(a => a.id));
          const storedIdsRaw = await storage.get<number[]>(CANVAS_ASSIGNMENT_IDS_KEY);
          
          if (storedIdsRaw) {
              const storedIds = new Set(storedIdsRaw);
              const newlyAdded = assignmentsData.filter(a => !storedIds.has(a.id));
              if (newlyAdded.length > 0) {
                  setNewAssignments(newlyAdded);
              }
          }
          if (assignmentsData.length > 0) {
             await storage.set(CANVAS_ASSIGNMENT_IDS_KEY, Array.from(newAssignmentIds));
          }
      }
      
      const courseMap = new Map(coursesData.map(c => [c.id, c.name]));
      const eventsData: CalendarEvent[] = assignmentsData
        .filter(a => a.due_at)
        .map(a => ({
        id: a.id,
        title: a.name,
        date: new Date(a.due_at!),
        type: a.name.toLowerCase().includes('quiz') ? 'quiz' : a.name.toLowerCase().includes('test') || a.name.toLowerCase().includes('exam') ? 'test' : 'assignment',
        course_id: a.course_id,
        courseName: courseMap.get(a.course_id) || 'Unknown Course',
      }));

      setCourses(coursesData);
      setAssignments(assignmentsData);
      setCalendarEvents(eventsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error("Critical error fetching canvas data:", err);
      setError(errorMessage);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    if (!enabled || !settings) {
      setLoading(false);
      setCourses([]);
      setAssignments([]);
      setCalendarEvents([]);
      setNewAssignments([]);
      setError(null);
      return;
    }
    
    fetchData();
  }, [enabled, settings, fetchData]);

  return { courses, assignments, calendarEvents, loading, error, newAssignments, connectionStatus, refetchData: fetchData };
};