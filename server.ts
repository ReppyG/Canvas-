// Fix: Import explicit types from express to resolve type errors.
// Fix: Changed import to use default express and namespace to avoid type conflicts with global Request/Response.
// Fix: Import `Request` and `Response` types directly from express.
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix: Explicitly type app as Express.
const app: Express = express();
// Render sets the PORT environment variable.
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the client build directory
// Fix: Explicitly set root path for static assets to resolve express typing issue.
app.use('/', express.static(path.join(__dirname, '..', 'dist')));

// Health check endpoint for Render
// Fix: Add explicit types for req and res to resolve express typing issue.
// Fix: Use express.Request and express.Response to avoid ambiguity with global types.
// Fix: Use `Request` and `Response` types imported from express.
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

// Fix: Use express.Request and express.Response to avoid ambiguity with global types.
// Fix: Use `Request` and `Response` types imported from express.
app.get('/api/canvas-proxy', async (req: Request, res: Response) => {
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

// Add a catch-all route to serve the main index.html file for any non-API routes.
// This is essential for single-page applications that use client-side routing.
// Fix: Use express.Request and express.Response to avoid ambiguity with global types.
// Fix: Use `Request` and `Response` types imported from express.
app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    } else {
        // If an unknown API route is hit, send a 404
        res.status(404).send({ error: 'API route not found' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});