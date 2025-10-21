import { Course, Assignment, Settings } from '../types';

/**
 * Enhanced fetch method with improved JSON parsing error handling
 * @param url Full URL to fetch
 * @param options Fetch request options
 * @returns Promise with parsed JSON response
 */
async function fetchWithJsonValidation<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    // Check if response is OK
    if (!response.ok) {
      // Try to extract error details
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(`API error (${response.status}): ${JSON.stringify(errorData)}`);
      } else {
        // If not JSON, get text for debugging
        const textContent = await response.text();
        console.error('Non-JSON error response:', textContent.substring(0, 200));
        throw new Error(`Connection failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON. The server returned status ${response.status}. If the connection test fails, you can still explore the app's features with sample data.`);
      }
    }
    
    // Verify content type before parsing as JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Not JSON content - log details for debugging
      const textContent = await response.text();
      console.error('Expected JSON but received:', contentType);
      console.error('Response preview:', textContent.substring(0, 200));
      throw new Error('Connection failed: Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON. The server may be returning a login page or error page. If the connection test fails, you can still explore the app\'s features with sample data.');
    }
    
    // Now safe to parse as JSON
    return await response.json() as T;
    
  } catch (error) {
    console.error(`API Error:`, error);
    
    // If it's the specific JSON parsing error, provide a more user-friendly message
    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      throw new Error('Connection failed: Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON. The server may be returning a login page or error page. If the connection test fails, you can still explore the app\'s features with sample data.');
    }
    
    // Re-throw the original error
    throw error;
  }
}

/**
 * Get courses from Canvas API
 */
export async function getCourses(settings: Settings): Promise<Course[]> {
  const url = `${settings.canvasUrl}/api/v1/courses?enrollment_state=active&per_page=100`;
  const options: RequestInit = {
    headers: {
      'Authorization': `Bearer ${settings.apiToken}`,
      'Accept': 'application/json',
    },
  };
  
  const courses = await fetchWithJsonValidation<Course[]>(url, options);
  return courses;
}

/**
 * Get assignments from Canvas API
 */
export async function getAssignments(settings: Settings): Promise<Assignment[]> {
  const url = `${settings.canvasUrl}/api/v1/users/self/courses?enrollment_state=active&per_page=100`;
  const options: RequestInit = {
    headers: {
      'Authorization': `Bearer ${settings.apiToken}`,
      'Accept': 'application/json',
    },
  };
  
  const courses = await fetchWithJsonValidation<Course[]>(url, options);
  
  // Fetch assignments for all courses
  const assignmentPromises = courses.map(async (course) => {
    const assignmentUrl = `${settings.canvasUrl}/api/v1/courses/${course.id}/assignments?per_page=100`;
    try {
      const assignments = await fetchWithJsonValidation<Assignment[]>(assignmentUrl, options);
      return assignments.map(assignment => ({
        ...assignment,
        courseName: course.name,
      }));
    } catch (error) {
      console.error(`Error fetching assignments for course ${course.id}:`, error);
      return [];
    }
  });
  
  const assignmentArrays = await Promise.all(assignmentPromises);
  const allAssignments = assignmentArrays.flat();
  
  return allAssignments;
}

/**
 * Test connection to Canvas API
 */
export async function testConnection(canvasUrl: string, apiToken: string): Promise<void> {
  const url = `${canvasUrl}/api/v1/users/self`;
  const options: RequestInit = {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  };
  
  await fetchWithJsonValidation(url, options);
}
