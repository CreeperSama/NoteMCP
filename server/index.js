// server/index.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Use promises for async/await
const path = require('path');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allow JSON data in requests

// --- CONFIGURATION ---
// This is where your notes will be saved on your computer.
// Change this path if you want them somewhere else!
const VAULT_PATH = path.join(__dirname, 'MyVault');

// Ensure the Vault folder exists
(async () => {
    try {
        await fs.mkdir(VAULT_PATH, { recursive: true });
        console.log(`📂 Vault is ready at: ${VAULT_PATH}`);
    } catch (err) {
        console.error("Error creating vault:", err);
    }
})();

// --- ROUTES ---

// 1. GET all files (List of notes)
app.get('/api/files', async (req, res) => {
    try {
        const files = await fs.readdir(VAULT_PATH);
        // Filter only .md files
        const mdFiles = files.filter(file => file.endsWith('.md'));
        res.json(mdFiles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

// 2. POST (Save a note)
app.post('/api/save', async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Ensure filename ends with .md
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(VAULT_PATH, safeName);

    try {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Saved: ${safeName}`);
        res.json({ message: 'File saved successfully', filename: safeName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// 3. GET (Read a specific note)
app.get('/api/file/:filename', async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(VAULT_PATH, filename);

    try {
        const content = await fs.readFile(filePath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(404).json({ error: 'File not found' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});