import { Course, Assignment, Settings, AssignmentStatus } from '../types';

const formatCanvasUrl = (url: string): string => {
    if (!url) return '';
    let formattedUrl = url.trim();

    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    try {
        const urlObject = new URL(formattedUrl);
        // This robustly gets the base origin, e.g., "https://yourschool.instructure.com"
        return urlObject.origin;
    } catch (error) {
        console.error("Invalid URL provided for formatting:", formattedUrl, error);
        // Fallback for cases where URL might be malformed but still usable as a prefix
        return formattedUrl.replace(/\/$/, ""); // Remove trailing slash
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
    
    // This is the correct, student-friendly endpoint to get all enrollments.
    const enrollmentsData: any[] = await fetchFromProxy('users/self/enrollments?state[]=active&include[]=course&per_page=50', canvasUrl, apiToken);
    
    // DEFINITIVE FIX: Removed the faulty `access_restricted_by_date` filter.
    // The API's `state[]=active` is the correct source of truth.
    return enrollmentsData
        .filter(enrollment => enrollment.type === 'StudentEnrollment' && enrollment.course && enrollment.course.name)
        .map(enrollment => ({
            id: enrollment.course.id,
            name: enrollment.course.name,
            course_code: enrollment.course.course_code,
        }));
};

// **ARCHITECTURAL FIX**: This function is now decoupled from `getCourses` and uses a more efficient endpoint.
export const getAssignments = async (settings: Settings): Promise<Assignment[]> => {
    const { apiToken } = settings;
    const canvasUrl = formatCanvasUrl(settings.canvasUrl);
    if (!canvasUrl || !apiToken) return [];
    
    // Use the more efficient endpoint to get all assignments for the user across all courses.
    const allAssignmentsData: any[] = await fetchFromProxy(`users/self/assignments?per_page=100&include[]=submission`, canvasUrl, apiToken);

    const allAssignments: Assignment[] = allAssignmentsData
        .filter(a => a && a.name && a.course_id) // Basic validation
        .map((a: any) => {
            let status: AssignmentStatus = 'NOT_STARTED';
            if (a.submission) {
                if (a.submission.workflow_state === 'graded' || a.submission.score !== null || a.submission.posted_at) {
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
                courseName: '', // This will be enriched later in the `useCanvasData` hook.
                status: status,
            };
        });
    
    // The sort algorithm is now robust and handles null due dates gracefully by pushing them to the end.
    return allAssignments.sort((a, b) => {
        const dateA = a.due_at ? new Date(a.due_at).getTime() : Infinity;
        const dateB = b.due_at ? new Date(b.due_at).getTime() : Infinity;
        if (dateA === Infinity && dateB === Infinity) return 0; // Keep original order if both have no date
        return dateA - dateB;
    });
};


// **CONSISTENCY FIX**: This now uses the same core endpoint as `getCourses`
// to ensure the test is an accurate reflection of the app's required permissions.
export const testConnection = async (canvasUrl: string, token: string): Promise<void> => {
    const formattedUrl = formatCanvasUrl(canvasUrl);
    await fetchFromProxy('users/self/enrollments?per_page=1&state[]=active', formattedUrl, token);
};