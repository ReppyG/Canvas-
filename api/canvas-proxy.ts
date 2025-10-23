import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS so your frontend can talk to this API
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    // Get the data sent from your frontend
    const { canvasUrl, endpoint, token } = req.body;

    // Validate that we have everything we need
    if (!canvasUrl || !endpoint || !token) {
      return res.status(400).json({ 
        error: 'Missing required fields: canvasUrl, endpoint, or token' 
      });
    }

    // Build the full Canvas API URL
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    console.log('Fetching from Canvas:', fullUrl); // Helpful for debugging!
    
    // Make the request to Canvas
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
