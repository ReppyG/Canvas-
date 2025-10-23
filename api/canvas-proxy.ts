import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- THIS IS THE SECURITY FIX ---
// List of websites *allowed* to call this API.
const allowedOrigins = [
  'https://canvas-git-main-asas-projects-75e8fd6e.vercel.app', // Your production site
  'http://localhost:3000', // For local development (if you use it)
  'http://localhost:5173', // For local Vite development (if you use it)
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- Secure CORS Handling ---
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (req.method !== 'OPTIONS') {
    // Block requests from unknown origins that aren't preflight
    return res.status(403).json({ error: 'Origin not allowed' });
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

  // --- Handle POST requests ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, must be POST' });
  }

  try {
    const { canvasUrl, endpoint, token } = req.body;

    if (!canvasUrl || !endpoint || !token) {
      return res.status(400).json({ 
        error: 'Missing required fields: canvasUrl, endpoint, or token' 
      });
    }

    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Use the token from the user
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Canvas API Error: ${errorText}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
