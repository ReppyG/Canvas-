# Copilot Instructions for Canvas AI Assistant

## Project Overview

Canvas AI Assistant is an intelligent dashboard application for Canvas LMS (Learning Management System) that integrates AI capabilities to help students manage their coursework, assignments, and studies more effectively. The application is available as both a Chrome browser extension and a standalone web application.

### Key Features
- **Dashboard**: Overview of courses, assignments, and calendar events
- **AI-Powered Tools**: 
  - AI Tutor Chat for getting help with course materials
  - Study Plan Generator for organizing study sessions
  - Content Summarizer for creating summaries of course materials
- **Canvas Integration**: Real-time data fetching from Canvas LMS API
- **Browser Extension**: Chrome extension with notifications and background service worker
- **Sample Data Mode**: Demo mode for testing without Canvas API credentials

## Technology Stack

### Core Technologies
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 4.4.5
- **Language**: TypeScript 5.0.2
- **Styling**: Tailwind CSS (via inline classes)
- **State Management**: React Hooks (useState, custom hooks)

### AI Integration
- **AI Provider**: Google Gemini API via @google/genai package
- **Services**: geminiService.ts for AI interactions

### Backend/API
- **Canvas API Integration**: canvasApiService.ts
- **Mock Data Service**: canvasMockService.ts for development/demo
- **Server**: Express.js (for API endpoints)
- **Storage**: Browser localStorage via storageService.ts

### Browser Extension
- **Manifest Version**: 3
- **Background Worker**: Service worker (background.ts)
- **Content Script**: Injection into Canvas pages (content.ts)
- **Permissions**: storage, alarms, notifications

## Project Structure

```
/
├── .github/               # GitHub configuration
│   └── workflows/        # CI/CD workflows
├── api/                  # API route handlers
├── components/           # React components
│   ├── Dashboard.tsx
│   ├── CoursesView.tsx
│   ├── AssignmentsView.tsx
│   ├── AiToolsView.tsx
│   ├── ChatView.tsx
│   ├── SettingsView.tsx
│   └── icons/           # Icon components
├── hooks/               # Custom React hooks
├── services/            # Service layer
│   ├── canvasApiService.ts
│   ├── canvasMockService.ts
│   ├── geminiService.ts
│   └── storageService.ts
├── netlify/             # Netlify deployment config
├── src/                 # Additional source files
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── background.ts        # Chrome extension background script
├── content.ts           # Chrome extension content script
├── canvasApp.ts         # Canvas integration logic
├── manifest.json        # Chrome extension manifest
└── package.json         # Dependencies and scripts
```

## Development Commands

### Prerequisites
- Node.js (v20.x recommended)
- npm package manager

### Setup
```bash
npm install                    # Install dependencies
```

### Development
```bash
npm run dev                    # Start development server (Vite)
npm run build                  # Build for production
npm run preview                # Preview production build
npm run typecheck              # Run TypeScript type checking
npm run lint                   # Run ESLint (requires eslint config)
```

### Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key (set in .env file)

## Coding Conventions

### TypeScript
- Use TypeScript strict mode (enabled in tsconfig.json)
- Define all types in `types.ts` for shared interfaces
- Use explicit type annotations for function parameters and return types
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values (e.g., `Page` enum)

### React Components
- Use functional components with React Hooks
- Use TypeScript `React.FC` type for component definitions
- Keep components in the `components/` directory
- Use PascalCase for component file names (e.g., `Dashboard.tsx`)
- Extract reusable logic into custom hooks in the `hooks/` directory

### Code Style
- Use camelCase for variables and functions
- Use PascalCase for types, interfaces, and React components
- Prefer const over let where possible
- Use arrow functions for inline callbacks
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### State Management
- Use `useState` for local component state
- Use custom hooks for shared state logic (e.g., `useSettings`, `useCanvasData`)
- Store persistent data using the `storageService.ts` abstraction

### API Integration
- All Canvas API calls should go through `canvasApiService.ts`
- Use `canvasMockService.ts` when `sampleDataMode` is enabled
- Handle loading and error states consistently across components
- Use `connectionStatus` to display API connectivity state

### Error Handling
- Always handle errors from async operations
- Display user-friendly error messages in the UI
- Log errors for debugging but don't expose sensitive information
- Use try-catch blocks for API calls

## Testing

Currently, the project has a test script defined (`vitest`) but no test files are present. When adding tests:
- Use Vitest as the testing framework
- Place test files adjacent to the code they test with `.test.ts` or `.test.tsx` extension
- Write unit tests for services and utility functions
- Write integration tests for complex component interactions

## Build & CI/CD

### Build Process
- Vite bundles the application into the `dist/` directory
- TypeScript compilation is handled by Vite
- CSS is processed inline (Tailwind classes)

### CI Workflow
The project has a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that:
1. Installs dependencies with `npm ci`
2. Runs type checking (if available)
3. Runs linting (if available)
4. Builds the project with `npm run build`
5. Runs tests (if available)

### Deployment
- Configured for Netlify deployment (netlify.toml)
- Also supports Vercel deployment (vercel.json)

## Key Constraints & Guidelines

### When Making Changes
1. **Preserve Existing Functionality**: Don't break working features
2. **Minimal Changes**: Make the smallest possible changes to achieve the goal
3. **Type Safety**: Maintain TypeScript strict mode compliance
4. **Component Isolation**: Keep components focused and single-purpose
5. **Service Layer**: Keep business logic in services, not components
6. **Error Handling**: Always handle errors gracefully with user feedback

### Common Patterns
- **Settings**: Use `useSettings` hook to access/modify user settings
- **Canvas Data**: Use `useCanvasData` hook to fetch Canvas LMS data
- **Page Navigation**: Use `Page` enum and state to switch views
- **Loading States**: Show loading spinner during async operations
- **Sample Data Mode**: Respect the `sampleDataMode` setting throughout the app

### What to Avoid
- Don't add new dependencies unless absolutely necessary
- Don't modify `types.ts` unless adding genuinely new types
- Don't change the Chrome extension manifest without careful consideration
- Don't remove or modify working tests (when they exist)
- Don't expose API keys or sensitive data in the code

## AI Integration Notes

### Gemini AI Usage
- AI features use Google's Gemini API via the `@google/genai` package
- AI interactions are handled through `geminiService.ts`
- Features include:
  - AI Tutor Chat: Conversational help with course material
  - Study Plan Generator: Creates personalized study plans
  - Content Summarizer: Summarizes course content and materials

### API Key Management
- API keys are stored in environment variables (`.env`)
- For the Chrome extension, keys are stored in browser storage
- Never commit API keys to the repository

## Canvas LMS Integration

### API Access
- Uses Canvas LMS REST API
- Requires Canvas domain URL and API token
- Supported endpoints:
  - Courses list
  - Assignments per course
  - Calendar events

### Authentication
- Access token stored in settings (via storageService)
- Token is sent in the Authorization header for API requests
- Sample data mode bypasses real API calls for testing

## Browser Extension Specifics

### Architecture
- **Background Script** (`background.ts`): Service worker for notifications and alarms
- **Content Script** (`content.ts`): Injected into Canvas pages
- **Popup/Action**: Opens the main React application

### Permissions
- `storage`: For persisting user settings and data
- `alarms`: For scheduling background tasks
- `notifications`: For showing assignment reminders
- `host_permissions`: Access to `*.instructure.com` domains

### Distribution
- Built with Vite
- Chrome Web Store ready via manifest.json
- Can be loaded as unpacked extension for development

## Additional Resources

- Canvas LMS API Documentation: https://canvas.instructure.com/doc/api/
- Google Gemini API: https://ai.google.dev/
- Vite Documentation: https://vitejs.dev/
- React Documentation: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
