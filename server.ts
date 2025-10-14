import express from 'express';
import cors from 'cors';

const app = express();
// Render sets the PORT environment variable.
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/canvas-proxy', async (req, res) => {
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
});

app.listen(port, () => {
    console.log(`Canvas proxy server listening at http://localhost:${port}`);
});
