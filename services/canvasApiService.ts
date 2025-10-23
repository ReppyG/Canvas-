// services/canvasApiService.ts
import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    // Remove http:// or https:// if present
    formattedUrl = formattedUrl.replace(/^https?:\/\//, '');
    
    // Remove trailing slash
    formattedUrl = formattedUrl.replace(/\/$/, '');
    
    // Remove any path segments (e.g., /login)
    formattedUrl = formattedUrl.split('/')[0];
    
    // Return with https:// protocol
    return `https://${formattedUrl}`;
};

const fetchFromCanvas = async (endpoint: string, canvasUrl: string, token: string): Promise<any> => {
    // Use the proxy endpoint
    const proxyUrl = '/api/canvas-proxy';
    
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            canvasUrl,
            endpoint,
            token
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    return await response.json();
};

export const getCourses = async (settings: Settings): Promise<Course[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
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

export const getAssignments = async (settings: Settings): Promise<Assignment[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    if (!canvasUrl || !apiToken) return [];

    const courses = await getCourses(settings);
    const courseMap = new Map(courses.map(course => [course.id, course.name]));

    const assignmentsData = await fetchFromCanvas('assignments?per_page=100', canvasUrl, apiToken);

    if (!Array.isArray(assignmentsData)) {
        console.error("Expected an array of assignments from Canvas API but received:", assignmentsData);
        return [];
    }
    
    const allAssignments: Assignment[] = assignmentsData.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        due_at: a.due_at,
        points_possible: a.points_possible,
        course_id: a.course_id,
        courseName: courseMap.get(a.course_id) || 'Unknown Course',
        status: (a.has_submitted_submissions ? 'COMPLETED' : 'NOT_STARTED') as AssignmentStatus,
    }));
    
    return allAssignments.filter(a => a.due_at);
};

export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    if (!canvasUrl || !canvasUrl.trim()) {
        throw new Error('Canvas URL is required');
    }
    if (!token || !token.trim()) {
        throw new Error('API token is required');
    }
    const formattedUrl = formatCanvasUrl(canvasUrl);
    if (!formattedUrl) {
        throw new Error('Invalid Canvas URL format');
    }
    await fetchFromCanvas('users/self', formattedUrl, token);
};
