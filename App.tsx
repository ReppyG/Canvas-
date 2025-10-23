// This file must be named App.tsx
// All your page logic from before now lives in this component.

import React, { useState } from 'react';

// 'export default' lets index.tsx import this component
export default function App() {
  // --- State Variables ---
  const [token, setToken] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');
  const [courses, setCourses] = useState(null);
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
          canvasUrl: canvasUrl,
          endpoint: 'courses', // We are asking for the 'courses' endpoint
          token: token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success!
        setCourses(data);
      } else {
        // This will show the error from the API (e.g., "Canvas API Error: ...")
        setError(data.error); 
      }
    } catch (err) {
      // --- THIS IS THE FIX ---
      // This will show the REAL error message on the page
      // instead of just "Unknown error"
      setError(`Request failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- This is the HTML (JSX) for your page ---
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-2xl">
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
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
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
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here (it's hidden)"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>

          {/* Fetch Button */}
          <button
            onClick={getMyCourses}
            disabled={isLoading} 
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Loading...' : 'Get My Courses'}
          </button>
        </div>

        {/* --- Results Area --- */}
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
