import { Course, Assignment, Settings } from '../types';

const SETTINGS_KEY = 'canvasAiAssistantSettings';

const fetchFromProxy = async (endpoint: string) => {
    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (!settingsRaw) {
        throw new Error('Canvas API credentials are not configured.');
    }
    const settings: Settings = JSON.parse(settingsRaw);
    if (!settings.canvasUrl || !settings.apiToken) {
        throw new Error('Canvas API credentials are not valid.');
    }

    const url = `/.netlify/functions/canvas-proxy?endpoint=${endpoint}`;
    
    const headers = {
        'x-canvas-url': settings.canvasUrl,
        'x-canvas-token': settings.apiToken,
    };
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch from proxy: ${response.statusText}`);
        } catch (e) {
             const errorText = await response.text();
             throw new Error(`Unexpected response from server (status ${response.status}). Please check your Canvas URL. Response: ${errorText.substring(0, 150)}`);
        }
    }
    
    try {
        return await response.json();
    } catch(e) {
        throw new Error('Received a successful response from the server, but it was not in the expected format (JSON).');
    }
};

export const testConnection = async (canvasUrl: string, apiToken: string): Promise<boolean> => {
    const endpoint = 'users/self/profile';
    const url = `/.netlify/functions/canvas-proxy?endpoint=${endpoint}`;

    const headers = {
        'x-canvas-url': canvasUrl,
        'x-canvas-token': apiToken,
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || `Proxy Error: ${response.statusText}`);
        } catch (e) {
             const errorText = await response.text();
             throw new Error(`Unexpected response from server (status ${response.status}). Please check your Canvas URL. Response: ${errorText.substring(0, 150)}`);
        }
    }
    
    try {
        await response.json();
    } catch (e) {
        throw new Error('Connection test was successful, but the response from Canvas was not in the expected format (JSON).');
    }
    
    return true;
};

export const getCourses = async (): Promise<Course[]> => {
    const rawCourses = await fetchFromProxy('courses?enrollment_state=active&per_page=50');
    return rawCourses.map((course: any) => ({
        id: course.id,
        name: course.name,
        courseCode: course.course_code,
    }));
};

export const getAssignments = async (): Promise<Assignment[]> => {
    const courses = await getCourses();
    const courseIds = courses.map(c => c.id);

    const assignmentPromises = courseIds.map(courseId => 
        fetchFromProxy(`courses/${courseId}/assignments?per_page=100`)
    );

    const results = await Promise.all(assignmentPromises);
    const allAssignments = results.flat(); 

    return allAssignments
      .filter((assignment: any) => assignment.due_at)
      .map((assignment: any) => ({
        id: assignment.id,
        title: assignment.name,
        courseId: assignment.course_id,
        dueDate: new Date(assignment.due_at),
        description: assignment.description || 'No description provided.',
        points: assignment.points_possible || 0,
    }));
};