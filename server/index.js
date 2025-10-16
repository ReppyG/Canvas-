const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React/Vite build output directory
const clientDist = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDist));

// SPA fallback - sends index.html for any unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving static files from: ${clientDist}`);
});
