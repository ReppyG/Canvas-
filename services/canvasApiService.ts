// Fix: Add a reference to chrome types to resolve 'Cannot find name 'chrome''.
/// <reference types="chrome" />

import { Course, Assignment, Settings } from '../types';

const SETTINGS_KEY = 'canvasAiAssistantSettings';

const getSettings = async (): Promise<Settings> => {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = data[SETTINGS_KEY];
    if (!settings) {
        throw new Error('Canvas API credentials are not configured.');
    }
    return settings;
};

const fetchFromCanvas = async (endpoint: string, settings: Settings) => {
    if (!settings.canvasUrl || !settings.apiToken) {
        throw new Error('Canvas API credentials are not valid.');
    }
    
    // Use proxy if VITE_PROXY_URL is set, otherwise use direct fetch for extension compatibility.
    const proxyApiUrl = import.meta.env.VITE_PROXY_URL;
    let response: Response;

    if (proxyApiUrl) {
        // Route all API calls through the Render proxy to bypass CORS issues.
        const proxyUrl = `${proxyApiUrl}/api/canvas-proxy?endpoint=${encodeURIComponent(endpoint)}`;
        
        const headers = {
            'X-Canvas-URL': settings.canvasUrl,
            'X-Canvas-Token': settings.apiToken, // Fixed typo from X--Canvas-Token
        };
        
        response = await fetch(proxyUrl, { headers });
    } else {
        // Fallback to direct fetch for extension context if no proxy is configured.
        const fullUrl = `${settings.canvasUrl}/api/v1/${endpoint}`;
        const directHeaders = {
            'Authorization': `Bearer ${settings.apiToken}`,
        };
        
        response = await fetch(fullUrl, { headers: directHeaders });
    }

    if (!response.ok) {
        try {
            const errorData = await response.json();
            const errorMessage = errorData?.errors?.[0]?.message || JSON.stringify(errorData);
            throw new Error(`Canvas API Error: ${errorMessage}`);
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
    const settings = { canvasUrl, apiToken, sampleDataMode: false };
    await fetchFromCanvas(endpoint, settings);
    return true;
};

export const getCourses = async (settingsOverride?: Settings): Promise<Course[]> => {
    const settings = settingsOverride || await getSettings();
    const rawCourses = await fetchFromCanvas('courses?enrollment_state=active&per_page=50', settings);
    return rawCourses.map((course: any) => ({
        id: course.id,
        name: course.name,
        courseCode: course.course_code,
    }));
};

export const getAssignments = async (settingsOverride?: Settings): Promise<Assignment[]> => {
    const settings = settingsOverride || await getSettings();
    const courses = await getCourses(settings);
    const courseIds = courses.map(c => c.id);

    const assignmentPromises = courseIds.map(courseId => 
        fetchFromCanvas(`courses/${courseId}/assignments?per_page=100`, settings)
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