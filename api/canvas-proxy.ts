import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Canvas-URL, X-Canvas-Token'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const endpoint = req.query.endpoint as string;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint query parameter is required.' });
    }

    const canvasUrl = req.headers['x-canvas-url'] as string;
    const apiToken = req.headers['x-canvas-token'] as string;

    if (!canvasUrl || !apiToken) {
        return res.status(401).json({ error: 'Canvas URL or API Token not provided in request headers.' });
    }

    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${apiToken}`,
    };

    try {
        const response = await fetch(fullUrl, { headers });
        const responseBody = await response.text();
        
        // Forward headers from Canvas API response
        res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/json');

        if (!response.ok) {
            try {
                // Try to parse as JSON, but forward as text if it fails
                const errorJson = JSON.parse(responseBody);
                return res.status(response.status).json({
                    error: `Canvas API error: ${response.statusText}`,
                    details: errorJson
                });
            } catch (e) {
                return res.status(response.status).send(responseBody);
            }
        }
        
        return res.status(200).send(responseBody);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(502).json({
            error: 'Failed to fetch from the provided Canvas URL.',
            details: errorMessage
        });
    }
}
