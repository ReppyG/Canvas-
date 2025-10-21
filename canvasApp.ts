/**
 * Canvas Application
 * Repository: ReppyG/Canvas-
 * Created: 2025-10-21
 * 
 * Main application file for Canvas helper
 */

// Types for canvas configurations and settings
export interface CanvasAppConfig {
  containerId?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  autoResize?: boolean;
  pixelRatio?: number;
}

// Types for drawable objects
export interface Drawable {
  draw(ctx: CanvasRenderingContext2D): void;
  update?(deltaTime: number): void;
}

export class CanvasApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private drawables: Drawable[] = [];
  private config: Required<CanvasAppConfig>;
  
  // Default configuration
  private static DEFAULT_CONFIG: Required<CanvasAppConfig> = {
    containerId: 'canvas-container',
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    autoResize: true,
    pixelRatio: window.devicePixelRatio || 1
  };

  /**
   * Creates a new Canvas application
   * @param config Configuration for the canvas app
   */
  constructor(config: CanvasAppConfig = {}) {
    // Merge provided config with defaults
    this.config = { ...CanvasApp.DEFAULT_CONFIG, ...config };
    
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width * this.config.pixelRatio;
    this.canvas.height = this.config.height * this.config.pixelRatio;
    this.canvas.style.width = `${this.config.width}px`;
    this.canvas.style.height = `${this.config.height}px`;
    
    // Get context
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;
    
    // Scale context based on pixel ratio
    this.ctx.scale(this.config.pixelRatio, this.config.pixelRatio);
    
    // Append to container if specified
    if (this.config.containerId) {
      const container = document.getElementById(this.config.containerId);
      if (container) {
        container.appendChild(this.canvas);
      } else {
        document.body.appendChild(this.canvas);
        console.warn(`Container with ID "${this.config.containerId}" not found, appended to body instead.`);
      }
    } else {
      document.body.appendChild(this.canvas);
    }
    
    // Setup event listeners
    if (this.config.autoResize) {
      window.addEventListener('resize', this.handleResize.bind(this));
      this.handleResize();
    }
  }
  
  /**
   * Handles window resize events
   */
  private handleResize(): void {
    if (!this.config.autoResize) return;
    
    const container = this.config.containerId 
      ? document.getElementById(this.config.containerId) 
      : document.body;
      
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      
      this.canvas.width = width * this.config.pixelRatio;
      this.canvas.height = height * this.config.pixelRatio;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      
      // Reset scale after resize
      this.ctx.scale(this.config.pixelRatio, this.config.pixelRatio);
    }
  }

  /**
   * Clears the canvas with the background color
   */
  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width / this.config.pixelRatio, 
                             this.canvas.height / this.config.pixelRatio);
  }

  /**
   * Main animation loop
   * @param timestamp Current timestamp
   */
  private animate(timestamp: number): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Clear canvas
    this.clear();
    
    // Update all drawables
    for (const drawable of this.drawables) {
      if (drawable.update) {
        drawable.update(deltaTime);
      }
    }
    
    // Draw all drawables
    for (const drawable of this.drawables) {
      drawable.draw(this.ctx);
    }
  }

  /**
   * Starts the animation loop
   */
  start(): void {
    if (this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }

  /**
   * Stops the animation loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Adds a drawable object to the canvas
   * @param drawable The drawable object to add
   */
  add(drawable: Drawable): void {
    this.drawables.push(drawable);
  }

  /**
   * Removes a drawable object from the canvas
   * @param drawable The drawable object to remove
   */
  remove(drawable: Drawable): void {
    const index = this.drawables.indexOf(drawable);
    if (index !== -1) {
      this.drawables.splice(index, 1);
    }
  }

  /**
   * Gets the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Gets the rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Gets the current width of the canvas
   */
  getWidth(): number {
    return this.canvas.width / this.config.pixelRatio;
  }

  /**
   * Gets the current height of the canvas
   */
  getHeight(): number {
    return this.canvas.height / this.config.pixelRatio;
  }

  /**
   * Disposes the canvas app and cleans up resources
   */
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.drawables = [];
    
    // Remove canvas from DOM
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Creates and returns a new CanvasApp instance
 * @param config Configuration for the canvas app
 */
export function createCanvasApp(config: CanvasAppConfig = {}): CanvasApp {
  return new CanvasApp(config);
}

// Example usage:
/*
import { createCanvasApp, Drawable } from './canvasApp';

// Create a simple rectangle
class Rectangle implements Drawable {
  constructor(
    private x: number,
    private y: number, 
    private width: number,
    private height: number,
    private color: string
  ) {}
  
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Initialize app
const app = createCanvasApp({
  containerId: 'my-canvas-container',
  width: 1000,
  height: 800,
  backgroundColor: '#f0f0f0'
});

// Add a rectangle
app.add(new Rectangle(100, 100, 200, 150, 'blue'));

// Start the animation loop
app.start();
*/
