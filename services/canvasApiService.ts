import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const fetchFromCanvas = async (endpoint: string, canvasUrl: string, token: string): Promise<any> => {
    const proxyUrl = `/api/canvas-proxy?endpoint=${encodeURIComponent(endpoint)}`;
    
    const response = await fetch(proxyUrl, {
        headers: { 
            'X-Canvas-URL': canvasUrl,
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

    // First, get all courses to create a map of course ID to course name. This is needed
    // because the general assignments endpoint below does not include the course name.
    const courses = await getCourses(settings);
    const courseMap = new Map(courses.map(course => [course.id, course.name]));

    // Fetch all assignments for the user in a single, more efficient API call.
    // The '/assignments' endpoint, when called with a student token, returns assignments
    // for all of their active courses. This is the correct, student-centric way to fetch this data.
    // We request a large number per page to avoid pagination issues with the current proxy.
    const assignmentsData = await fetchFromCanvas('assignments?per_page=100', canvasUrl, apiToken);

    if (!Array.isArray(assignmentsData)) {
        console.error("Expected an array of assignments from Canvas API but received:", assignmentsData);
        // Return empty array to prevent crashes downstream
        return [];
    }
    
    const allAssignments: Assignment[] = assignmentsData.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        due_at: a.due_at,
        points_possible: a.points_possible,
        course_id: a.course_id,
        // Enrich with course name from our map
        courseName: courseMap.get(a.course_id) || 'Unknown Course',
        status: (a.has_submitted_submissions ? 'COMPLETED' : 'NOT_STARTED') as AssignmentStatus,
    }));
    
    // The app handles filtering and sorting, but we filter out assignments without a due date
    // as they are typically not actionable in the same way.
    return allAssignments.filter(a => a.due_at);
};

export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    await fetchFromCanvas('users/self', canvasUrl, token);
};