
// This is a Netlify Function that acts as a secure proxy for the Canvas API.
// It lives in the `netlify/functions` directory.

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const endpoint = event.queryStringParameters?.endpoint;

  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Endpoint query parameter is required.' }),
    };
  }
  
  // Headers from the client are lowercased by Netlify Functions.
  const canvasUrl = event.headers['x-canvas-url'];
  const apiToken = event.headers['x-canvas-token'];

  if (!canvasUrl || !apiToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Canvas URL or API Token not provided in request headers.' }),
    };
  }

  const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
  };

  try {
    const response = await fetch(fullUrl, { headers });
    
    if (!response.ok) {
        const errorBody = await response.text();
        // Try to parse the error body as JSON, as Canvas often returns structured errors.
        try {
            const errorJson = JSON.parse(errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Canvas API error: ${response.statusText}`, details: errorJson }),
            };
        } catch (e) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Canvas API error: ${response.statusText}`, details: errorBody }),
            };
        }
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    // This typically catches network errors, e.g., if the canvasUrl is invalid.
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ error: 'Failed to fetch from the provided Canvas URL.', details: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};