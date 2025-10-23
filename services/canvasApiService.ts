import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    // Ensure it starts with https://
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    try {
        const urlObject = new URL(formattedUrl);

        // For official canvas domains, it's safe to assume the API is at the root.
        // This strips paths like /login or /dashboard that users might copy.
        if (urlObject.hostname.endsWith('.instructure.com')) {
            return urlObject.origin;
        }

        // For custom domains (e.g., university.edu/canvas), we preserve the path.
        // We reconstruct the URL without query params or hash.
        let path = urlObject.pathname;
        // Remove trailing slash from path if it's not the root path itself
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        return `${urlObject.origin}${path}`;

    } catch (error) {
        console.error("Invalid URL provided, using fallback formatting:", formattedUrl, error);
        // Fallback for malformed URLs that the constructor might reject
        let fallbackUrl = formattedUrl;
        if (fallbackUrl.endsWith('/')) {
            fallbackUrl = fallbackUrl.slice(0, -1);
        }
        return fallbackUrl;
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