/**
 * Canvas API Service
 * Handles API communication with proper error handling for JSON parsing
 */
export class ApiService {
  private baseUrl: string;
  private apiToken: string | null;
  private currentUser: { login: string; name: string } = { login: 'ReppyG', name: 'Sample User' };
  
  /**
   * Initialize the API service
   * @param baseUrl The Canvas API base URL
   * @param apiToken Optional API token for authentication
   */
  constructor(baseUrl: string, apiToken: string | null = null) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiToken = apiToken;
  }
  
  /**
   * Enhanced fetch method with improved JSON parsing error handling
   * @param endpoint API endpoint path (e.g., '/api/v1/users/self')
   * @param options Fetch request options
   * @returns Promise with parsed JSON response
   */
  async fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      
      // Prepare headers with authorization if token is available
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
      };
      
      if (this.apiToken) {
        headers['Authorization'] = `Bearer ${this.apiToken}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Check if response is OK
      if (!response.ok) {
        // Try to extract error details
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(`API error: ${JSON.stringify(errorData)}`);
        } else {
          // If not JSON, get text for debugging
          const textContent = await response.text();
          console.error('Non-JSON error response:', textContent.substring(0, 200));
          throw new Error(`Request failed with status ${response.status}`);
        }
      }
      
      // Verify content type before parsing as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON content - log details for debugging
        const textContent = await response.text();
        console.error('Expected JSON but received:', contentType);
        console.error('Response preview:', textContent.substring(0, 200));
        throw new Error('Response is not valid JSON');
      }
      
      // Now safe to parse as JSON
      const data = await response.json() as T;
      
      // If this is user data, update the currentUser
      if (endpoint.includes('/users/self') && data) {
        this.currentUser = {
          login: (data as any).login_id || 'ReppyG',
          name: (data as any).name || 'Sample User'
        };
      }
      
      return data;
      
    } catch (error) {
      console.error(`API Error:`, error);
      
      // If it's the specific JSON parsing error, provide a more user-friendly message
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        throw new Error('Connection failed: Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON. The server may be returning a login page or error page.');
      }
      
      // Re-throw the original error
      throw error;
    }
  }
  
  /**
   * Test connection to Canvas API
   * @returns Object with success status and message
   */
  async testConnection(): Promise<{success: boolean; message: string}> {
    try {
      // Use a simple endpoint to test connection
      await this.fetchData('/api/v1/users/self');
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  }
  
  /**
   * Get current date time in UTC YYYY-MM-DD HH:MM:SS format
   * @returns Formatted date-time string
   */
  getCurrentDateTime(): string {
    const now = new Date();
    return now.toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '');
  }
  
  /**
   * Get current user's login name
   * @returns User login name
   */
  getUserLogin(): string {
    return this.currentUser.login;
  }
  
  /**
   * Get current user's full name
   * @returns User full name
   */
  getUserName(): string {
    return this.currentUser.name;
  }
}
