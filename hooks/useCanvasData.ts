

import { useState, useEffect } from 'react';
import { Course, Assignment, CalendarEvent, Settings } from '../types';
import * as apiService from '../services/canvasApiService';
import * as mockService from '../services/canvasMockService';

const SETTINGS_KEY = 'canvasAiAssistantSettings';
const CANVAS_ASSIGNMENT_IDS_KEY = 'canvasAiAssistantAssignmentIds';

export const useCanvasData = (enabled: boolean) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'sample' | 'error'>('live');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setCourses([]);
      setAssignments([]);
      setCalendarEvents([]);
      setNewAssignments([]);
      setError(null);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        setNewAssignments([]);
        
        const settingsData = await chrome.storage.local.get(SETTINGS_KEY);
        const settings: Settings | null = settingsData[SETTINGS_KEY];
        
        const useSampleData = settings?.sampleDataMode ?? false;
        const service = useSampleData ? mockService : apiService;
        
        setConnectionStatus(useSampleData ? 'sample' : 'live');

        const [coursesData, assignmentsData] = await Promise.all([
            service.getCourses(),
            service.getAssignments(),
        ]);
        
        if (!useSampleData) {
            const newAssignmentIds = new Set(assignmentsData.map(a => a.id));
            const storedIdsData = await chrome.storage.local.get(CANVAS_ASSIGNMENT_IDS_KEY);
            const storedIdsRaw = storedIdsData[CANVAS_ASSIGNMENT_IDS_KEY];
            
            if (storedIdsRaw) {
                const storedIds = new Set(storedIdsRaw as number[]);
                const newlyAdded = assignmentsData.filter(a => !storedIds.has(a.id));
                if (newlyAdded.length > 0) {
                    setNewAssignments(newlyAdded);
                }
            }
            if (assignmentsData.length > 0) {
               await chrome.storage.local.set({ [CANVAS_ASSIGNMENT_IDS_KEY]: Array.from(newAssignmentIds) });
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
    
    setLoading(true);
    fetchData();
  }, [enabled]);

  return { courses, assignments, calendarEvents, loading, error, newAssignments, connectionStatus };
};