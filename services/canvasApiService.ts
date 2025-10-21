// Fix: Import Settings and AssignmentStatus types
import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const fetchFromCanvas = async (endpoint: string, domain: string, token: string): Promise<any> => {
    // This now uses a relative path to a proxy server. This is a standard and secure way
    // to handle cross-origin API requests from a web application, avoiding CORS errors.
    const proxyUrl = `/api/canvas-proxy?endpoint=${encodeURIComponent(endpoint)}`;
    
    const response = await fetch(proxyUrl, {
        headers: { 
            'X-Canvas-URL': `https://${domain.replace(/^https?:\/\//, '')}`,
            'X-Canvas-Token': token
        }
    });

    if (!response.ok) {
        let errorMessage = `Proxy Error (${response.status})`;
        try {
            const errorData = await response.json();
            // Use optional chaining for safer property access
            errorMessage += `: ${errorData?.error || errorData?.errors?.[0]?.message || JSON.stringify(errorData)}`;
        } catch (e) {
             const textError = await response.text();
             errorMessage += `: ${textError.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
    }
    
    // Get the content type to check if response is actually JSON
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    // Check if we received HTML instead of JSON (common when proxy endpoint is not configured)
    if (!contentType?.includes('application/json') || responseText.trim().startsWith('<')) {
        throw new Error('The proxy endpoint is not configured correctly. Please ensure the backend server is running or configure the Vite proxy settings.');
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Invalid JSON response from Canvas API: ${responseText.slice(0, 100)}`);
    }
};

export const fetchCanvasData = async (domain: string, accessToken: string): Promise<{ courses: Course[], assignments: Assignment[] }> => {
    const coursesData: any[] = await fetchFromCanvas('courses?enrollment_state=active', domain, accessToken);
    
    const courses: Course[] = coursesData
        .filter(course => course.name)
        .map(course => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code,
        }));

    const allAssignments: Assignment[] = [];
    // Limit to first 5 courses to avoid too many requests, as in user's sample code
    for (const course of courses.slice(0, 5)) {
        try {
            const assignmentsData = await fetchFromCanvas(`courses/${course.id}/assignments`, domain, accessToken);
            if (Array.isArray(assignmentsData)) {
                const enrichedAssignments = assignmentsData.map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    due_at: a.due_at,
                    points_possible: a.points_possible,
                    course_id: course.id,
                    courseName: course.name
                }));
                allAssignments.push(...enrichedAssignments);
            }
        } catch (err) {
            console.error(`Error fetching assignments for course ${course.id}:`, err);
        }
    }

    const validAssignments = allAssignments.filter(a => a.due_at);
    
    return { courses, assignments: validAssignments };
}

// Fix: Add missing getCourses function
export const getCourses = async (settings: Settings): Promise<Course[]> => {
    const { canvasUrl, apiToken } = settings;
    if (!canvasUrl || !apiToken) return [];
    
    const coursesData: any[] = await fetchFromCanvas('courses?enrollment_state=active', canvasUrl, apiToken);
    return coursesData
        .filter(course => course.name)
        .map(course => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code,
        }));
};

// Fix: Add missing getAssignments function
export const getAssignments = async (settings: Settings): Promise<Assignment[]> => {
    const { canvasUrl, apiToken } = settings;
    if (!canvasUrl || !apiToken) return [];

    const courses = await getCourses(settings);
    const allAssignments: Assignment[] = [];
    for (const course of courses.slice(0, 10)) { // Limiting for performance
        try {
            const assignmentsData = await fetchFromCanvas(`courses/${course.id}/assignments`, canvasUrl, apiToken);
            if (Array.isArray(assignmentsData)) {
                const enrichedAssignments = assignmentsData.map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    due_at: a.due_at,
                    points_possible: a.points_possible,
                    course_id: course.id,
                    courseName: course.name,
                    // FIX: Explicitly cast status to AssignmentStatus to prevent TypeScript from widening the type to 'string'.
                    status: (a.has_submitted_submissions ? 'COMPLETED' : 'NOT_STARTED') as AssignmentStatus, // Basic status logic
                }));
                allAssignments.push(...enrichedAssignments);
            }
        } catch (err) {
            console.error(`Error fetching assignments for course ${course.id}:`, err);
        }
    }
    return allAssignments.filter(a => a.due_at);
};

// Fix: Add missing testConnection function
export const testConnection = async (domain: string, token: string): Promise<void> => {
    await fetchFromCanvas('users/self', domain, token);
};