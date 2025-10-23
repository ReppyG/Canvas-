// This file must be named App.tsx
// It now handles both login and the main app logic.

import React, { useState, useEffect } from 'react';

// --- Main App Component ---
// This component now decides which page to show
export default function App() {
  // --- Auth State ---
  const [token, setToken] = useState<string | null>(null);
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Prevents flash of login page

  // On app load, check localStorage for saved credentials
  useEffect(() => {
    const storedData = localStorage.getItem('canvasAuth');
    if (storedData) {
      try {
        const { token, canvasUrl } = JSON.parse(storedData);
        if (token && canvasUrl) {
          setToken(token);
          setCanvasUrl(canvasUrl);
        }
      } catch (e) {
        console.error("Failed to parse auth data", e);
        localStorage.removeItem('canvasAuth');
      }
    }
    setIsAuthReady(true); // Finished checking auth
  }, []);

  // --- Auth Functions ---
  const handleLogin = (token: string, url: string) => {
    const authData = JSON.stringify({ token, canvasUrl: url });
    localStorage.setItem('canvasAuth', authData);
    setToken(token);
    setCanvasUrl(url);
  };

  const handleLogout = () => {
    localStorage.removeItem('canvasAuth');
    setToken(null);
    setCanvasUrl(null);
  };

  // --- Conditional Rendering ---
  
  // Don't show anything until we've checked localStorage
  if (!isAuthReady) {
    return null; // Or a loading spinner
  }

  if (!token || !canvasUrl) {
    // Show login page if not logged in
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show main app page if logged in
  return <MainPage token={token} canvasUrl={canvasUrl} onLogout={handleLogout} />;
}

// --- Internal Component: LoginPage ---
// This component is only for logging in
function LoginPage({ onLogin }: { onLogin: (token: string, url: string) => void }) {
  const [localToken, setLocalToken] = useState('');
  const [localUrl, setLocalUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (localToken && localUrl) {
      // Basic check for a valid-looking URL
      if (!localUrl.startsWith('http://') && !localUrl.startsWith('https://')) {
        setError('Please enter a full URL (e.g., https://canvas.instructure.com)');
        return;
      }
      onLogin(localToken, localUrl);
    } else {
      setError('Please fill in both fields.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-6 text-center">Student Platform</h1>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-4">
          {/* Canvas URL Input */}
          <div>
            <label 
              htmlFor="canvas-url" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Canvas URL
            </label>
            <input
              type="text"
              id="canvas-url"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="e.g., https://canvas.instructure.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>

          {/* API Token Input */}
          <div>
            <label 
              htmlFor="api-token" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Canvas API Token
            </label>
            <input
              type="password"
              id="api-token"
              value={localToken}
              onChange={(e) => setLocalToken(e.target.value)}
              placeholder="Paste your token here (it's hidden)"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>

          {/* Login Button */}
          <button
            onClick={handleSubmit}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Login
          </button>

          {/* Show Error Message */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}

// --- Internal Component: MainPage ---
// This is the main part of your app (the old App.tsx logic)
function MainPage({ token, canvasUrl, onLogout }: { token: string; canvasUrl: string; onLogout: () => void; }) {
  // --- STATE (Reverted) ---
  const [courses, setCourses] = useState(null); // Will store the raw JSON
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Handle Button Click ---
  const getMyCourses = async () => {
    setCourses(null);
    setError('');
    setIsLoading(true);

    const proxyApiUrl = '/api/canvas-proxy'; // Your Vercel API endpoint

    try {
      const response = await fetch(proxyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasUrl: canvasUrl, // From props
          endpoint: 'courses',  // We are asking for the 'courses' endpoint
          token: token,         // From props
        }),
      });
      
      if (response.ok) {
        // If successful, we expect JSON
        const data = await response.json();
        setCourses(data); // Set the raw JSON data
        
      } else {
        // If it failed, it might be a JSON error from our API
        // or an HTML error page from Vercel (like a 404 or 500)
        const errorText = await response.text();
        try {
          const jsonError = JSON.parse(errorText);
          setError(jsonError.error || "An unknown API error occurred.");
        } catch (e) {
          setError(`API Error: ${response.status} - ${errorText.substring(0, 100)}...`);
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(`Request failed: ${err.message}`);
      } else {
        setError("An unknown request error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6 w-full">
          <h1 className="text-4xl font-bold">Your Platform</h1>
          <button
            onClick={onLogout}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            You are logged in. Click the button to fetch your courses from Canvas.
          </p>
          {/* Fetch Button */}
          <button
            onClick={getMyCourses}
            disabled={isLoading} 
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Loading...' : 'Fetch My Courses'}
          </button>
        </div>

        {/* --- Results Area (Reverted) --- */}
        <div className="mt-8">
          {/* Show Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Show Success Message (Courses) */}
          {courses && (
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <h2 className="text-2xl font-semibold mb-4">Your Courses</h2>
              <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto">
                {JSON.stringify(courses, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

