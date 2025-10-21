import { ApiService } from './apiService';

/**
 * Header component for displaying date/time and user info
 */
export class HeaderComponent {
  private element: HTMLElement;
  private apiService: ApiService;
  private timeInterval: number | null = null;
  
  /**
   * Initialize the header component
   * @param elementId DOM element ID for the header
   * @param apiService API service instance
   */
  constructor(elementId: string, apiService: ApiService) {
    this.element = document.getElementById(elementId) || document.createElement('div');
    if (!document.getElementById(elementId)) {
      this.element.id = elementId;
      document.body.prepend(this.element);
    }
    this.apiService = apiService;
  }
  
  /**
   * Start the header component with timer
   */
  start(): void {
    this.render();
    
    // Update time every second
    this.timeInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }
  
  /**
   * Stop the timer
   */
  stop(): void {
    if (this.timeInterval !== null) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }
  
  /**
   * Render the header component
   */
  render(): void {
    this.element.innerHTML = `
      <div class="canvas-header">
        <div class="datetime-display">
          Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 
          <span id="current-datetime">${this.apiService.getCurrentDateTime()}</span>
        </div>
        <div class="user-info">
          Current User's Login: <span id="current-user-login">${this.apiService.getUserLogin()}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Update just the date/time part
   */
  updateDateTime(): void {
    const datetimeElement = this.element.querySelector('#current-datetime');
    if (datetimeElement) {
      datetimeElement.textContent = this.apiService.getCurrentDateTime();
    }
  }
}
