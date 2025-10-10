import { useState, useEffect } from 'react';
import { Course, Assignment, CalendarEvent, Settings } from '../types';
import * as mockService from '../services/canvasMockService';
import * as apiService from '../services/canvasApiService';

const CANVAS_ASSIGNMENT_IDS_KEY = 'canvasAiAssistantAssignmentIds';

export const useCanvasData = (settings: Settings | null) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNewAssignments([]);
        setConnectionWarning(null);
        let coursesData: Course[], assignmentsData: Assignment[];

        if (settings?.canvasUrl && settings?.apiToken) {
            try {
                // Fetch from live API
                [coursesData, assignmentsData] = await Promise.all([
                    apiService.getCourses(settings),
                    apiService.getAssignments(settings),
                ]);
            } catch (err) {
                 console.error("Failed to fetch live canvas data", err);
                 // Graceful fallback for CORS errors
                 if (err instanceof TypeError && err.message === 'Failed to fetch') {
                    setConnectionWarning('Live connection failed due to a browser security restriction (CORS). Loading sample data instead.');
                    // Fallback to mock data
                    [coursesData, assignmentsData] = await Promise.all([
                        mockService.getCourses(),
                        mockService.getAssignments(),
                    ]);
                 } else {
                    // Handle other errors (e.g., 401 Unauthorized) as blocking errors
                    throw err;
                 }
            }
        } else {
            // Fetch from mock service if not configured
            [coursesData, assignmentsData] = await Promise.all([
                mockService.getCourses(),
                mockService.getAssignments(),
            ]);
        }

        // Check for new assignments
        const newAssignmentIds = new Set(assignmentsData.map(a => a.id));
        const storedIdsRaw = localStorage.getItem(CANVAS_ASSIGNMENT_IDS_KEY);
        
        if (storedIdsRaw) {
            const storedIds = new Set(JSON.parse(storedIdsRaw) as number[]);
            const newlyAdded = assignmentsData.filter(a => !storedIds.has(a.id));
            if (newlyAdded.length > 0) {
                setNewAssignments(newlyAdded);
            }
        }
        // Store current assignment IDs for next comparison, only if there are assignments to prevent overwriting with empty on error.
        if (assignmentsData.length > 0) {
           localStorage.setItem(CANVAS_ASSIGNMENT_IDS_KEY, JSON.stringify(Array.from(newAssignmentIds)));
        }
        
        // Derive calendar events from assignments
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
        // This catch block now only handles critical, blocking errors
        console.error("Critical error fetching canvas data", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        // Clear data on error
        setCourses([]);
        setAssignments([]);
        setCalendarEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [settings]);

  return { courses, assignments, calendarEvents, loading, error, newAssignments, connectionWarning };
};