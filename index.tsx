import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Main entry point for the Canvas application
 */
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
