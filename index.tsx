import { CanvasApp } from './canvasApp';

/**
 * Main entry point for the Canvas application
 */
document.addEventListener('DOMContentLoaded', () => {
  // Get API settings from localStorage or configuration
  const apiBaseUrl = localStorage.getItem('canvas_api_url') || 'https://canvas.instructure.com';
  const apiToken = localStorage.getItem('canvas_api_token') || undefined;
  
  // Create app container if it doesn't exist
  if (!document.getElementById('canvas-app')) {
    const appContainer = document.createElement('div');
    appContainer.id = 'canvas-app';
    document.body.appendChild(appContainer);
    
    // Create header container
    const headerContainer = document.createElement('div');
    headerContainer.id = 'canvas-header';
    appContainer.appendChild(headerContainer);
    
    // Create notification container
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    appContainer.appendChild(notificationContainer);
    
    // Create courses container
    const coursesContainer = document.createElement('div');
    coursesContainer.id = 'courses-container';
    appContainer.appendChild(coursesContainer);
  }
  
  // Initialize and start the app
  const app = new CanvasApp(apiBaseUrl, apiToken);
  app.start().catch(error => {
    console.error('Failed to start application:', error);
  });
  
  // For debugging
  (window as any).canvasApp = app;
});
