import { Course, Assignment } from '../types';

const fetchFromProxy = async (endpoint: string) => {
    // This URL points to our Netlify Function.
    const url = `/.netlify/functions/canvas-proxy?endpoint=${endpoint}`;
    
    // No headers needed here, the proxy handles authentication.
    const response = await fetch(url);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch from proxy: ${response.statusText}`);
    }
    return response.json();
};

export const testConnection = async (): Promise<boolean> => {
    // A lightweight endpoint to verify credentials and connectivity via the proxy.
    await fetchFromProxy('users/self/profile');
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
