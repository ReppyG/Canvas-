import { useState, useEffect } from 'react';
import { Course, Assignment, CalendarEvent, Settings } from '../types';
import * as apiService from '../services/canvasApiService';
import * as mockService from '../services/canvasMockService';

const SETTINGS_KEY = 'canvasAiAssistantSettings';
const CANVAS_ASSIGNMENT_IDS_KEY = 'canvasAiAssistantAssignmentIds';

export const useCanvasData = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'sample' | 'error'>('live');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNewAssignments([]);
        
        const settingsRaw = localStorage.getItem(SETTINGS_KEY);
        const settings: Settings | null = settingsRaw ? JSON.parse(settingsRaw) : null;
        
        const useSampleData = settings?.sampleDataMode ?? false;
        const service = useSampleData ? mockService : apiService;
        
        setConnectionStatus(useSampleData ? 'sample' : 'live');

        const [coursesData, assignmentsData] = await Promise.all([
            service.getCourses(),
            service.getAssignments(),
        ]);
        
        // This logic only applies to live data, but is harmless for sample data.
        if (!useSampleData) {
            const newAssignmentIds = new Set(assignmentsData.map(a => a.id));
            const storedIdsRaw = localStorage.getItem(CANVAS_ASSIGNMENT_IDS_KEY);
            
            if (storedIdsRaw) {
                const storedIds = new Set(JSON.parse(storedIdsRaw) as number[]);
                const newlyAdded = assignmentsData.filter(a => !storedIds.has(a.id));
                if (newlyAdded.length > 0) {
                    setNewAssignments(newlyAdded);
                }
            }
            if (assignmentsData.length > 0) {
               localStorage.setItem(CANVAS_ASSIGNMENT_IDS_KEY, JSON.stringify(Array.from(newAssignmentIds)));
            }
        }
        
        const eventsData: CalendarEvent[] = assignmentsData.map(a => ({
          id: a.id,
          title: a.title,
          date: a.dueDate,
          type: a.title.toLowerCase().includes('quiz') ? 'quiz' : a.title.toLowerCase().includes('test') || a.title.toLowerCase().includes('exam') ? 'test' : 'assignment',
          courseId: a.courseId,
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
    };

    fetchData();
  }, []);

  return { courses, assignments, calendarEvents, loading, error, newAssignments, connectionStatus };
};
