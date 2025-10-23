import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    } else {
        formattedUrl = formattedUrl.replace(/^http:\/\//i, 'https://');
    }

    if (formattedUrl.endsWith('/')) {
        formattedUrl = formattedUrl.slice(0, -1);
    }
    return formattedUrl;
};

const fetchFromCanvas = async (endpoint: string, canvasUrl: string, token: string): Promise<any> => {
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    const response = await fetch(fullUrl, {
        headers: { 
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        const responseBody = await response.text();
        let errorMessage = `Canvas API Error (${response.status})`;
        try {
            // Attempt to parse for a detailed error message from Canvas.
            const errorData = JSON.parse(responseBody);
            errorMessage += `: ${errorData?.errors?.[0]?.message || JSON.stringify(errorData)}`;
        } catch (e) {
             // If parsing fails, use the raw text.
             errorMessage += `: ${responseBody.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
    }
    
    // If the response was successful, parse the JSON body.
    try {
        return await response.json();
    } catch (e) {
        console.error("Failed to parse successful Canvas API response:", e);
        throw new Error("Received an invalid response from the Canvas API.");
    }
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
    const formattedUrl = formatCanvasUrl(canvasUrl);
    await fetchFromCanvas('users/self', formattedUrl, token);
};