// api/canvas-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This lets your app talk to this function from the browser
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  // Handle "preflight" requests (browsers do this automatically)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the data from your app
    const { canvasUrl, endpoint, token } = req.body;

    // Make sure all required info is there
    if (!canvasUrl || !endpoint || !token) {
      return res.status(400).json({ 
        error: 'Missing required fields: canvasUrl, endpoint, or token' 
      });
    }

    // Build the full Canvas URL
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    // Send the request to Canvas
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if Canvas responded with an error
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Canvas API Error: ${errorText}` 
      });
    }

    // Success! Send the data back to your app
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
