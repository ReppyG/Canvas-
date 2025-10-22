import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const fetchFromCanvas = async (endpoint: string, domain: string, token: string): Promise<any> => {
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
            errorMessage += `: ${errorData?.error || errorData?.errors?.[0]?.message || JSON.stringify(errorData)}`;
        } catch (e) {
             const textError = await response.text();
             errorMessage += `: ${textError.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
};

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
                    status: (a.has_submitted_submissions ? 'COMPLETED' : 'NOT_STARTED') as AssignmentStatus,
                }));
                allAssignments.push(...enrichedAssignments);
            }
        } catch (err) {
            console.error(`Error fetching assignments for course ${course.id}:`, err);
        }
    }
    return allAssignments.filter(a => a.due_at);
};

export const testConnection = async (domain: string, token: string): Promise<void> => {
    await fetchFromCanvas('users/self', domain, token);
};