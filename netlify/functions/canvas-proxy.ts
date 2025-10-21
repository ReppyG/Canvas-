import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Set CORS headers to allow requests from any origin
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, PATCH, DELETE, POST, PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Canvas-URL, X-Canvas-Token',
        'Access-Control-Allow-Credentials': 'true',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    const endpoint = event.queryStringParameters?.endpoint;

    if (!endpoint) {
        return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Endpoint query parameter is required.' }),
        };
    }

    const canvasUrl = event.headers['x-canvas-url'];
    const apiToken = event.headers['x-canvas-token'];

    if (!canvasUrl || !apiToken) {
        return {
            statusCode: 401,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Canvas URL or API Token not provided in request headers.' }),
        };
    }

    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    const requestHeaders = {
        'Authorization': `Bearer ${apiToken}`,
    };

    try {
        const response = await fetch(fullUrl, { headers: requestHeaders });
        const responseBody = await response.text();
        
        // Forward Content-Type header from Canvas API response
        const contentType = response.headers.get('Content-Type') || 'application/json';

        if (!response.ok) {
            try {
                // Try to parse as JSON, but forward as text if it fails
                const errorJson = JSON.parse(responseBody);
                return {
                    statusCode: response.status,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: `Canvas API error: ${response.statusText}`,
                        details: errorJson
                    }),
                };
            } catch (e) {
                return {
                    statusCode: response.status,
                    headers: { ...headers, 'Content-Type': contentType },
                    body: responseBody,
                };
            }
        }
        
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': contentType },
            body: responseBody,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            statusCode: 502,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to fetch from the provided Canvas URL.',
                details: errorMessage
            }),
        };
    }
};
