import { Settings, Course, Assignment } from '../types';

const fetchCanvasAPI = async (endpoint: string, settings: Settings) => {
    const url = `${settings.canvasUrl}/api/v1/${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${settings.apiToken}`
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized: Invalid API Token. Please check your settings.');
        }
        throw new Error(`Failed to fetch from Canvas API: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

export const testConnection = async (settings: Settings): Promise<boolean> => {
    // A lightweight endpoint to verify credentials and connectivity.
    await fetchCanvasAPI('users/self/profile', settings);
    return true;
};

export const getCourses = async (settings: Settings): Promise<Course[]> => {
    // Fetch only active courses
    const rawCourses = await fetchCanvasAPI('courses?enrollment_state=active&per_page=50', settings);
    return rawCourses.map((course: any) => ({
        id: course.id,
        name: course.name,
        courseCode: course.course_code,
    }));
};

export const getAssignments = async (settings: Settings): Promise<Assignment[]> => {
    // Fetch assignments for all active courses
    const courses = await getCourses(settings);
    const courseIds = courses.map(c => c.id);

    // Get assignments for all courses in parallel
    const assignmentPromises = courseIds.map(courseId => 
        fetchCanvasAPI(`courses/${courseId}/assignments?per_page=100`, settings)
    );

    const results = await Promise.all(assignmentPromises);
    const allAssignments = results.flat(); // Flatten the array of arrays

    return allAssignments
      .filter((assignment: any) => assignment.due_at) // Filter out assignments with no due date
      .map((assignment: any) => ({
        id: assignment.id,
        title: assignment.name,
        courseId: assignment.course_id,
        dueDate: new Date(assignment.due_at),
        description: assignment.description || 'No description provided.', // Handle null descriptions
        points: assignment.points_possible || 0,
    }));
};