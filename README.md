<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1F5OgI3FxrP62yW86oyM3m4lVzAj7ZQE6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. **For Development:** Run both the backend server and Vite dev server:
   
   Terminal 1 - Start the backend API server:
   ```bash
   npx tsc --project tsconfig.server.json
   node dist-server/server.js
   ```
   
   Terminal 2 - Start the Vite dev server:
   ```bash
   npm run dev
   ```
   
   Then open http://localhost:5173 in your browser.

4. **For Production:** Build and run:
   ```bash
   npm run build
   npx tsc --project tsconfig.server.json
   node dist-server/server.js
   ```
   
   Then open http://localhost:3001 in your browser.
