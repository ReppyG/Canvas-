
// Fix: Import Settings type
import { Course, Assignment, Settings } from '../types';

const fetchFromCanvas = async (endpoint: string, domain: string, token: string): Promise<any> => {
    // Ensure domain is clean
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const fullUrl = `https://${cleanDomain}/api/v1/${endpoint}`;
    
    const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        let errorMessage = `Canvas API Error (${response.status})`;
        try {
            const errorData = await response.json();
            errorMessage += `: ${errorData?.errors?.[0]?.message || JSON.stringify(errorData)}`;
        } catch (e) {
             const textError = await response.text();
             errorMessage += `: ${textError.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
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
    for (const course of courses.slice(0, 5)) { // Limiting for performance
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
                    status: a.has_submitted_submissions ? 'COMPLETED' : 'NOT_STARTED', // Basic status logic
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
