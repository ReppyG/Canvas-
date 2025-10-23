import { Course, Assignment, Settings } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    // Ensure it starts with https://
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    try {
        const urlObject = new URL(formattedUrl);
        // The API base is almost always the origin (e.g., https://school.instructure.com).
        // This is the most reliable method and avoids errors from complex path stripping.
        return urlObject.origin;
    } catch (error) {
        console.error("Invalid URL provided for formatting:", formattedUrl, error);
        // If the URL is invalid, the API call will fail, which is the correct behavior.
        // Return the malformed URL so the error message might provide a hint.
        return formattedUrl;
    }
};

// This function is now responsible for calling our own backend proxy, not Canvas directly.
const fetchFromProxy = async (endpoint: string, canvasUrl: string, token: string): Promise<any> => {
    // The proxy is located at /api/canvas-proxy, relative to the current domain.
    const proxyUrl = '/api/canvas-proxy';

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            canvasUrl: canvasUrl, // The base URL for the user's canvas instance
            endpoint: endpoint,   // The specific API endpoint (e.g., 'courses')
            token: token          // The user's API token
        }),
    });
    
    const responseBody = await response.text();

    if (!response.ok) {
        let errorMessage = `API Error (${response.status})`;
        try {
            // The proxy forwards a JSON object with an 'error' key.
            const errorData = JSON.parse(responseBody);
            errorMessage = errorData.error || responseBody;
        } catch (e) {
             // If parsing fails (e.g., Canvas returned an HTML error page), use the raw text.
             errorMessage = responseBody.slice(0, 500);
        }
        throw new Error(errorMessage);
    }
    
    // If the response was successful, parse the JSON body.
    try {
        return JSON.parse(responseBody);
    } catch (e) {
        console.error("Failed to parse successful response from proxy:", e);
        throw new Error("Received an invalid response from the application proxy.");
    }
};

export const getCourses = async (settings: Settings): Promise<Course[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    if (!canvasUrl || !apiToken) return [];
    
    const coursesData: any[] = await fetchFromProxy('courses?enrollment_state=active&per_page=50', canvasUrl, apiToken);
    return coursesData
        .filter(course => course.name && !course.access_restricted_by_date)
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

    const assignmentsData = await fetchFromProxy('assignments?per_page=100&include[]=submission', canvasUrl, apiToken);

    if (!Array.isArray(assignmentsData)) {
        console.error("Expected an array of assignments from Canvas API but received:", assignmentsData);
        return [];
    }
    
    const allAssignments: Assignment[] = assignmentsData
        .filter(a => a.due_at && a.name && courseMap.has(a.course_id)) // Filter out assignments for courses we don't have
        .map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            due_at: a.due_at,
            points_possible: a.points_possible,
            course_id: a.course_id,
            courseName: courseMap.get(a.course_id) || 'Unknown Course',
            // Use submission data to determine status, more reliable than has_submitted_submissions
            status: (a.submission && a.submission.workflow_state !== 'unsubmitted') ? 'COMPLETED' : 'NOT_STARTED',
        }));
    
    return allAssignments;
};

export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    const formattedUrl = formatCanvasUrl(canvasUrl);
    // Test connection by fetching self profile, a lightweight endpoint.
    await fetchFromProxy('users/self', formattedUrl, token);
};