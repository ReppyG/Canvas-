// This is a Netlify Function that acts as a secure proxy for the Canvas API.
// It lives in the `netlify/functions` directory.

interface Event {
  queryStringParameters: {
    endpoint?: string;
  };
}

export const handler = async (event: Event) => {
  const { endpoint } = event.queryStringParameters;

  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Endpoint query parameter is required.' }),
    };
  }

  const canvasUrl = process.env.CANVAS_API_URL;
  const apiToken = process.env.CANVAS_API_TOKEN;

  if (!canvasUrl || !apiToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Canvas URL or API Token is not configured in Netlify environment variables.' }),
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
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: `Canvas API error: ${response.statusText}`, details: errorBody }),
        };
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch from Canvas API.', details: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};
