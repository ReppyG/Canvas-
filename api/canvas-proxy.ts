import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- THIS IS THE SECURITY FIX ---
// List of websites *allowed* to call this API.
const allowedOrigins = [
  'https://canvas-git-main-asas-projects-75e8fd6e.vercel.app', // Your production site
  'http://localhost:3000', // For local development (optional)
  'http://localhost:5173', // For local Vite development (optional)
  'https://canvas-puce-one.vercel.app',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- Secure CORS Handling ---
  const origin = req.headers.origin;

  // Only allow origins from our list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow this specific origin
  } else {
    // If the origin is not in our list, block it.
    // This is optional but good practice.
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // --- THIS IS WHAT YOU WANTED ---
    // Get all data, including the token, from the frontend
    const { canvasUrl, endpoint, token } = req.body;

    // Validate that we have everything we need
    if (!canvasUrl || !endpoint || !token) {
      return res.status(400).json({ 
        error: 'Missing required fields: canvasUrl, endpoint, or token' 
      });
    }

    // Build the full Canvas API URL
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    console.log('Fetching from Canvas:', fullUrl); 
    
    // Make the request to Canvas
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Use the token from the user
        'Content-Type': 'application/json',
      },
    });

    // Check if Canvas returned an error
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Canvas API Error:', errorText);
      return res.status(response.status).json({ 
        error: `Canvas API Error: ${errorText}` 
      });
    }

    // Success! Return the data
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

