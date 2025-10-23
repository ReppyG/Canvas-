import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define the list of allowed origins.
// In production, Vercel sets the VERCEL_URL environment variable.
const allowedOrigins = process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [];

// For local development, add localhost origins.
// The `vite` dev script in package.json runs on port 5173 by default.
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://localhost:3000'); // Common alternative
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin;

    // Set CORS headers based on the origin of the request
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
    );

    // Handle preflight (OPTIONS) requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { canvasUrl, endpoint, token } = req.body;

        if (!canvasUrl || !endpoint || !token) {
            return res.status(400).json({
                error: 'Missing required fields: canvasUrl, endpoint, or token'
            });
        }

        // Build the full Canvas API URL
        const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;

        const canvasResponse = await fetch(fullUrl, {
            method: 'GET', // The proxy always makes a GET request to Canvas in this design
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const responseBody = await canvasResponse.text();

        // Pass through Canvas's status code and headers for content type
        res.setHeader('Content-Type', canvasResponse.headers.get('Content-Type') || 'application/json');
        
        // Check if the response from Canvas was not OK.
        if (!canvasResponse.ok) {
            // Attempt to parse the error from Canvas and send it back
            try {
                const errorJson = JSON.parse(responseBody);
                return res.status(canvasResponse.status).json({ error: `Canvas API Error: ${errorJson?.errors?.[0]?.message || responseBody}` });
            } catch (e) {
                // If the error response isn't JSON, send the raw text
                return res.status(canvasResponse.status).json({ error: `Canvas API Error: ${responseBody}` });
            }
        }
        
        // Success: send the raw response body from Canvas.
        return res.status(canvasResponse.status).send(responseBody);

    } catch (error) {
        console.error('Proxy internal error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'An internal server error occurred in the proxy.'
        });
    }
}
