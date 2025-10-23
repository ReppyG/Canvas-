import { Course, Assignment, Settings, AssignmentStatus } from '../types';

/**
 * Formats and validates a Canvas URL to ensure it's properly structured
 * @param url Raw URL input from user
 * @returns Normalized Canvas base URL
 */
const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    // Ensure HTTPS protocol
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    } else {
        formattedUrl = formattedUrl.replace(/^http:\/\//i, 'https://');
    }

    try {
        const urlObject = new URL(formattedUrl);
        return urlObject.origin;
    } catch (error) {
        console.error("Invalid URL provided:", formattedUrl, error);
        return formattedUrl.replace(/\/$/, "");
    }
};

/**
 * Fetches data from Canvas API via the proxy endpoint
 * Implements retry logic and proper error handling
 */
const fetchFromProxy = async (
    endpoint: string, 
    canvasUrl: string, 
    token: string,
    retries = 2
): Promise<any> => {
    const proxyUrl = '/api/canvas-proxy';

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
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
                    if (errorText.includes("HTML error page")) {
                        errorMessage = "Received an HTML error page. Please verify your Canvas URL is correct.";
                    } else {
                        errorMessage = errorText.slice(0, 500);
                    }
                }
                
                // Don't retry on 401/403 (auth errors)
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Canvas API Error: ${errorMessage}`);
                }
                
                // Retry on 5xx errors
                if (attempt < retries && response.status >= 500) {
                    console.warn(`Attempt ${attempt + 1} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                
                throw new Error(`Canvas API Error: ${errorMessage}`);
            }
            
            const responseBody = await response.text();
            try {
                return JSON.parse(responseBody);
            } catch (e) {
                console.error("Failed to parse response:", responseBody);
                throw new Error("Received invalid JSON from Canvas API");
            }
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            console.warn(`Attempt ${attempt + 1} failed, retrying...`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
};

/**
 * Fetches all active courses for the authenticated user
 * FIXED: Uses the correct student-facing endpoint
 */
export const getCourses = async (settings: Settings): Promise<Course[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    
    if (!canvasUrl || !apiToken) {
        console.warn('Canvas settings not configured');
        return [];
    }
    
    try {
        // THIS IS THE CORRECT ENDPOINT FOR STUDENTS
        // It returns courses where the user has active enrollment
        const coursesData: any[] = await fetchFromProxy(
            'courses?enrollment_state=active&include[]=term&per_page=100',
            canvasUrl,
            apiToken
        );
        
        // Filter out courses that are:
        // 1. Missing required fields
        // 2. Restricted by date (not yet started)
        // 3. Concluded/completed
        const validCourses = coursesData.filter(course => {
            if (!course || !course.name) return false;
            
            // Skip if access is restricted by date
            if (course.access_restricted_by_date) return false;
            
            // Skip if workflow state is not available or deleted
            if (course.workflow_state === 'deleted' || course.workflow_state === 'completed') {
                return false;
            }
            
            return true;
        });
        
        return validCourses.map(course => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code || 'N/A',
        }));
    } catch (error) {
        console.error('Failed to fetch courses:', error);
        throw error;
    }
};

/**
 * Fetches assignments for a specific course
 * Includes submission status for proper tracking
 */
const getAssignmentsForCourse = async (
    courseId: number, 
    canvasUrl: string, 
    apiToken: string
): Promise<any[]> => {
    try {
        return await fetchFromProxy(
            `courses/${courseId}/assignments?per_page=100&include[]=submission`,
            canvasUrl,
            apiToken
        );
    } catch (error) {
        // Log but don't throw - we want to get assignments from other courses
        console.warn(`Failed to fetch assignments for course ${courseId}:`, error);
        return [];
    }
};

/**
 * Determines assignment status from Canvas submission data
 */
const determineAssignmentStatus = (submission: any): AssignmentStatus => {
    if (!submission) return 'NOT_STARTED';
    
    // Check if graded or has a score
    if (submission.workflow_state === 'graded' || 
        submission.score !== null || 
        submission.posted_at) {
        return 'COMPLETED';
    }
    
    // Check if submitted but not graded
    if (submission.submitted_at || submission.workflow_state === 'submitted') {
        return 'IN_PROGRESS';
    }
    
    return 'NOT_STARTED';
};

/**
 * Fetches all assignments for the provided courses
 * FIXED: Properly uses the pre-fetched course list
 * FIXED: Uses Promise.allSettled to handle partial failures gracefully
 */
export const getAssignments = async (
    settings: Settings, 
    courses: Course[]
): Promise<Assignment[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    
    if (!canvasUrl || !apiToken || courses.length === 0) {
        console.warn('Cannot fetch assignments: missing settings or courses');
        return [];
    }
    
    // Create a lookup map for course names
    const courseMap = new Map(courses.map(course => [course.id, course.name]));

    // Fetch assignments for all courses in parallel
    const assignmentPromises = courses.map(course => 
        getAssignmentsForCourse(course.id, canvasUrl, apiToken)
    );

    // Use allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(assignmentPromises);
    
    // Collect successful results
    const allAssignmentsRaw: any[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            allAssignmentsRaw.push(...result.value);
        } else {
            console.warn(
                `Could not fetch assignments for course ${courses[index].name}:`,
                result.reason
            );
        }
    });

    // Process and filter assignments
    const processedAssignments: Assignment[] = allAssignmentsRaw
        .filter(a => {
            // Only include assignments that:
            // 1. Exist and have required fields
            // 2. Have a due date (we need this for sorting/calendar)
            // 3. Belong to a known course
            return a && 
                   a.due_at && 
                   a.name && 
                   courseMap.has(a.course_id) &&
                   a.published !== false; // Skip unpublished assignments
        })
        .map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description || null,
            due_at: a.due_at,
            points_possible: a.points_possible || 0,
            course_id: a.course_id,
            courseName: courseMap.get(a.course_id) || 'Unknown Course',
            status: determineAssignmentStatus(a.submission),
        }));
    
    // Sort by due date (earliest first)
    return processedAssignments.sort((a, b) => 
        new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
    );
};

/**
 * Tests the Canvas API connection
 * FIXED: Uses the same endpoint as getCourses for consistency
 */
export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    const formattedUrl = formatCanvasUrl(canvasUrl);
    
    if (!formattedUrl) {
        throw new Error('Invalid Canvas URL provided');
    }
    
    if (!token || token.trim().length === 0) {
        throw new Error('API token cannot be empty');
    }
    
    try {
        // Test with a lightweight endpoint
        await fetchFromProxy(
            'courses?enrollment_state=active&per_page=1',
            formattedUrl,
            token
        );
    } catch (error) {
        if (error instanceof Error) {
            // Provide user-friendly error messages
            if (error.message.includes('401') || error.message.includes('403')) {
                throw new Error('Invalid API token or insufficient permissions. Please generate a new token in Canvas.');
            }
            if (error.message.includes('HTML error page')) {
                throw new Error('Invalid Canvas URL. Please verify the URL is correct (e.g., yourschool.instructure.com)');
            }
        }
        throw error;
    }
}
