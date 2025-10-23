// Using `any` for event and context because @netlify/functions is not a project dependency.
export const handler = async (event: any, context: any) => {
    // Handle OPTIONS preflight request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Canvas-URL, X-Canvas-Token',
            },
        };
    }

    const endpoint = event.queryStringParameters?.endpoint;
    if (!endpoint) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Endpoint query parameter is required.' }) };
    }

    const canvasUrl = event.headers['x-canvas-url'];
    const apiToken = event.headers['x-canvas-token'];

    if (!canvasUrl || !apiToken) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Canvas URL or API Token not provided in request headers.' }) };
    }
    
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    const headers = { 'Authorization': `Bearer ${apiToken}` };

    try {
        const response = await fetch(fullUrl, { headers });
        const responseBody = await response.text();

        const responseHeaders: { [key: string]: string } = {
            'Access-Control-Allow-Origin': '*', // Required for the actual response
            'Content-Type': response.headers.get('Content-Type') || 'application/json'
        };

        return {
            statusCode: response.status,
            headers: responseHeaders,
            body: responseBody
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            statusCode: 502,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Proxy failed to fetch from the Canvas API.', details: errorMessage })
        };
    }
};
