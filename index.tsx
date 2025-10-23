import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // This imports the App component from App.tsx

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// This renders your App component into the <div id="root"></div>
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* We've temporarily removed ThemeProvider and AuthProvider.
      We can add them back once those files are created.
    */}
    <App />
  </React.StrictMode>
);
