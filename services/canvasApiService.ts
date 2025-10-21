const handleTestConnection = async () => {
    setTestStatus('testing');
    console.log('Testing with URL:', getFormattedUrl());
    console.log('Testing with token:', apiToken.substring(0, 10) + '...');
    
    try {
        await testConnection(getFormattedUrl(), apiToken.trim());
        setTestStatus('success');
        setTestMessage('Successfully connected to the Canvas API!');
    } catch (err) {
        console.error('Connection test failed:', err);
        setTestStatus('error');
        // ... rest of error handling
    }
};
import { Course, Assignment, Settings } from '../types';

const isProduction = import.meta.env.PROD;
const API_BASE = isProduction ? '/api/canvas-proxy' : 'http://localhost:3001/api/canvas-proxy';

/**
 * Helper function to make requests through the proxy
 */
async function proxyFetch(endpoint: string, settings: Settings): Promise<Response> {
  const url = `${API_BASE}?endpoint=${encodeURIComponent(endpoint)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Canvas-URL': settings.canvasUrl,
      'X-Canvas-Token': settings.apiToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    } else {
      // This is likely an HTML error page
      const text = await response.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Received HTML instead of JSON. This may be a CORS issue or authentication problem.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  return response;
}

/**
 * Test connection to Canvas API
 */
export async function testConnection(canvasUrl: string, apiToken: string): Promise<void> {
  try {
    await proxyFetch('users/self', { canvasUrl, apiToken, sampleDataMode: false });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to connect to Canvas API');
  }
}

/**
 * Get all courses for the current user
 */
export async function getCourses(settings: Settings): Promise<Course[]> {
  try {
    const response = await proxyFetch('courses?enrollment_state=active&per_page=100', settings);
    const contentType = response.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
      throw new Error('Expected JSON response but received: ' + contentType);
    }
    
    const data = await response.json();
    
    // Canvas returns an array of courses
    if (!Array.isArray(data)) {
      console.error('Unexpected response format:', data);
      throw new Error('Invalid response format from Canvas API');
    }
    
    return data.map((course: any) => ({
      id: course.id,
      name: course.name,
      course_code: course.course_code || 'N/A',
    }));
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

/**
 * Get all assignments for the current user
 */
export async function getAssignments(settings: Settings): Promise<Assignment[]> {
  try {
    // First get all courses
    const courses = await getCourses(settings);
    
    // Then get assignments for each course
    const assignmentPromises = courses.map(async (course) => {
      try {
        const response = await proxyFetch(
          `courses/${course.id}/assignments?per_page=100`,
          settings
        );
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.warn(`Invalid assignments response for course ${course.id}`);
          return [];
        }
        
        return data.map((assignment: any) => ({
          id: assignment.id,
          name: assignment.name,
          description: assignment.description || null,
          due_at: assignment.due_at || null,
          points_possible: assignment.points_possible || null,
          course_id: course.id,
          courseName: course.name,
          status: 'NOT_STARTED' as const,
        }));
      } catch (error) {
        console.warn(`Failed to fetch assignments for course ${course.id}:`, error);
        return [];
      }
    });
    
    const assignmentArrays = await Promise.all(assignmentPromises);
    return assignmentArrays.flat();
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}
