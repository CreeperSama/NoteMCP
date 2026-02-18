const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Use promises for async/await
const path = require('path');
const mongoose = require('mongoose'); // Import Mongoose
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allow JSON data in requests

// --- 1. CONNECT TO MONGODB ---
// Connects to your local MongoDB instance
mongoose.connect('mongodb://localhost:27017/obsidian-clone')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// --- 2. DEFINE THE HISTORY SCHEMA ---
const HistorySchema = new mongoose.Schema({
    filename: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const History = mongoose.model('History', HistorySchema);

// --- CONFIGURATION ---
// This is where your notes will be saved on your computer.
const VAULT_PATH = path.join(__dirname, 'MyVault');

// Ensure the Vault folder exists when server starts
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

// 2. GET (Read a specific note)
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

// 3. POST (Save a note + Save History)
app.post('/api/save', async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Ensure filename ends with .md
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(VAULT_PATH, safeName);

    try {
        // A. Write to HARD DRIVE (The "Real" File)
        await fs.writeFile(filePath, content, 'utf8');

        // B. Write to DATABASE (The "History" Snapshot)
        await History.create({
            filename: safeName,
            content: content
        });

        console.log(`Saved & Snapshotted: ${safeName}`);
        res.json({ message: 'File saved successfully', filename: safeName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// 4. POST (Rename a note) - NEW FEATURE
app.post('/api/rename', async (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Missing names' });

    const oldPath = path.join(VAULT_PATH, oldName);
    const safeNewName = newName.endsWith('.md') ? newName : `${newName}.md`;
    const newPath = path.join(VAULT_PATH, safeNewName);

    try {
        // Check if new name already exists to prevent overwriting
        try {
            await fs.access(newPath);
            // If access works, file exists -> Error
            return res.status(409).json({ error: 'File already exists' });
        } catch (e) {
            // If access fails, file does not exist -> Good to go!
        }

        await fs.rename(oldPath, newPath);
        console.log(`Renamed: ${oldName} -> ${safeNewName}`);

        res.json({ success: true, newName: safeNewName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Rename failed' });
    }
});

// 5. GET (Fetch History for a specific note)
app.get('/api/history/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        // Find all versions of this file, sort by newest first, limit to 20
        const versions = await History.find({ filename }).sort({ timestamp: -1 }).limit(20);
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});