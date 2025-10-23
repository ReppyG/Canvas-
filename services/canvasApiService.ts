import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    try {
        const urlObject = new URL(formattedUrl);
        return urlObject.origin;
    } catch (error) {
        console.error("Invalid URL provided for formatting:", formattedUrl, error);
        return formattedUrl;
    }
};

const fetchFromProxy = async (endpoint: string, canvasUrl: string, token: string): Promise<any> => {
    const proxyUrl = '/api/canvas-proxy';

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            canvasUrl: canvasUrl,
            endpoint: endpoint,
            token: token
        }),
    });

    const contentType = response.headers.get('Content-Type') || '';
    
    if (!response.ok) {
        let errorMessage = `API Error (${response.status})`;
        if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || `Received status ${response.status}`;
        } else {
            const errorText = await response.text();
             // The proxy itself now provides a clean error for HTML responses
            if (errorText.includes("HTML error page")) {
                 errorMessage = "Received an HTML error page instead of data. Please check your Canvas URL.";
            } else {
                 errorMessage = errorText.slice(0, 500);
            }
        }
        throw new Error(`Canvas API Error: ${errorMessage}`);
    }
    
    // If the response was successful, parse the JSON body.
    const responseBody = await response.text();
    try {
        return JSON.parse(responseBody);
    } catch (e) {
        console.error("Failed to parse successful response from proxy:", responseBody);
        throw new Error("Received an invalid JSON response from the application proxy.");
    }
};

export const getCourses = async (settings: Settings): Promise<Course[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    if (!canvasUrl || !apiToken) return [];
    
    const enrollmentsData: any[] = await fetchFromProxy('users/self/enrollments?state[]=active&include[]=course&per_page=50', canvasUrl, apiToken);
    
    return enrollmentsData
        .filter(enrollment => enrollment.type === 'StudentEnrollment' && enrollment.course && enrollment.course.name && !enrollment.course.access_restricted_by_date)
        .map(enrollment => ({
            id: enrollment.course.id,
            name: enrollment.course.name,
            course_code: enrollment.course.course_code,
        }));
};

const getAssignmentsForCourse = async (courseId: number, canvasUrl: string, apiToken: string): Promise<any[]> => {
    // Fetch assignments for one specific course. This is the student-friendly approach.
    return fetchFromProxy(`courses/${courseId}/assignments?per_page=100&include[]=submission`, canvasUrl, apiToken);
};

export const getAssignments = async (settings: Settings): Promise<Assignment[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    if (!canvasUrl || !apiToken) return [];

    const courses = await getCourses(settings);
    if (courses.length === 0) return [];
    
    const courseMap = new Map(courses.map(course => [course.id, course.name]));

    const assignmentPromises = courses.map(course => 
        getAssignmentsForCourse(course.id, canvasUrl, apiToken)
    );

    // Use Promise.allSettled to ensure that even if one course fails (e.g., is concluded),
    // we still get results from the others. This is a robust way to handle partial failures.
    const results = await Promise.allSettled(assignmentPromises);
    
    const successfulAssignments: any[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successfulAssignments.push(...result.value);
        } else {
            // Log the error for the specific course that failed, for debugging purposes.
            console.warn(`Could not fetch assignments for course ${courses[index].name} (ID: ${courses[index].id}). Reason:`, result.reason);
        }
    });

    const allAssignments: Assignment[] = successfulAssignments
        .filter(a => a && a.due_at && a.name && courseMap.has(a.course_id))
        .map((a: any) => {
            let status: AssignmentStatus = 'NOT_STARTED';
            if (a.submission) {
                if (a.submission.workflow_state === 'graded' || a.submission.score !== null) {
                    status = 'COMPLETED';
                } else if (a.submission.submitted_at) {
                    status = 'IN_PROGRESS';
                }
            }
            
            return {
                id: a.id,
                name: a.name,
                description: a.description,
                due_at: a.due_at,
                points_possible: a.points_possible,
                course_id: a.course_id,
                courseName: courseMap.get(a.course_id) || 'Unknown Course',
                status: status,
            };
        });
    
    return allAssignments;
};

export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    const formattedUrl = formatCanvasUrl(canvasUrl);
    // Test connection by fetching enrollments. This is the most accurate test for
    // the app's functionality, especially for student accounts.
    await fetchFromProxy('users/self/enrollments?per_page=1', formattedUrl, token);
};