import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'canvas-proxy-middleware',
      configureServer(server) {
        // Use express.json() middleware to parse JSON bodies
        server.middlewares.use(express.json());

        // Middleware to proxy requests to the Canvas API
        server.middlewares.use('/api/canvas-proxy', async (req, res) => {
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          try {
            const { canvasUrl, endpoint, token } = req.body as { canvasUrl: string, endpoint: string, token: string };

            if (!canvasUrl || !endpoint || !token) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing required fields: canvasUrl, endpoint, or token' }));
              return;
            }

            const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
            const canvasResponse = await fetch(fullUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            const responseBody = await canvasResponse.text();
            const contentType = canvasResponse.headers.get('Content-Type') || 'application/json';
            
            res.setHeader('Content-Type', contentType);
            res.statusCode = canvasResponse.status;

            if (!canvasResponse.ok) {
              if (contentType.includes('text/html')) {
                res.end(JSON.stringify({ error: `Canvas API Error: Received an HTML error page instead of data. Please check your Canvas URL.` }));
                return;
              }
              try {
                const errorJson = JSON.parse(responseBody);
                const errorMessage = errorJson?.errors?.[0]?.message || responseBody;
                res.end(JSON.stringify({ error: `Canvas API Error: ${errorMessage}` }));
              } catch (e) {
                res.end(JSON.stringify({ error: `Canvas API Error: ${responseBody}` }));
              }
              return;
            }
            
            res.end(responseBody);

          } catch (error) {
            console.error('Proxy middleware error:', error);
            res.statusCode = 500;
            const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred in the proxy middleware.';
            res.end(JSON.stringify({ error: errorMessage }));
          }
        });
      },
    }
  ],
});