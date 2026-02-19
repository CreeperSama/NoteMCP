const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect('mongodb://localhost:27017/obsidian-clone')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const HistorySchema = new mongoose.Schema({
    filename: String, // Stores the relative path e.g. "Work/Project1.md"
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema);

// --- FILE SYSTEM CONFIG ---
const VAULT_PATH = path.join(__dirname, 'MyVault');

(async () => {
    try {
        await fs.mkdir(VAULT_PATH, { recursive: true });
        console.log(`📂 Vault Path: ${VAULT_PATH}`);
    } catch (err) { console.error("Vault creation error:", err); }
})();

// --- HELPER: RECURSIVE DIRECTORY SCAN ---
async function scanDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const tree = await Promise.all(entries.map(async (entry) => {
        const relativePath = path.relative(VAULT_PATH, path.join(dirPath, entry.name));

        if (entry.isDirectory()) {
            return {
                type: 'folder',
                name: entry.name,
                path: relativePath,
                children: await scanDirectory(path.join(dirPath, entry.name))
            };
        } else if (entry.name.endsWith('.md')) {
            return {
                type: 'file',
                name: entry.name,
                path: relativePath
            };
        }
        return null;
    }));

    return tree.filter(item => item !== null);
}

// --- API ROUTES ---

// Get the entire folder/file tree
app.get('/api/files', async (req, res) => {
    try {
        const tree = await scanDirectory(VAULT_PATH);
        res.json(tree);
    } catch (err) { res.status(500).json({ error: 'Scan failed' }); }
});

// Read a file (using ?path=Folder/File.md)
app.get('/api/file', async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        const content = await fs.readFile(path.join(VAULT_PATH, filePath), 'utf8');
        res.json({ content });
    } catch (err) { res.status(404).json({ error: 'File not found' }); }
});

// Create a folder
app.post('/api/folder', async (req, res) => {
    const { path: folderPath } = req.body;
    try {
        await fs.mkdir(path.join(VAULT_PATH, folderPath), { recursive: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Folder creation failed' }); }
});

// Save a file + History
app.post('/api/save', async (req, res) => {
    const { path: filePath, content } = req.body;
    const fullPath = path.join(VAULT_PATH, filePath);

    try {
        await fs.writeFile(fullPath, content, 'utf8');
        await History.create({ filename: filePath, content }); // Snapshot for history
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Save failed' }); }
});

// Rename/Move a file
app.post('/api/rename', async (req, res) => {
    const { oldPath, newPath } = req.body;
    try {
        await fs.rename(path.join(VAULT_PATH, oldPath), path.join(VAULT_PATH, newPath));
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Rename failed' }); }
});

// Fetch history for a file
app.get('/api/history', async (req, res) => {
    const filePath = req.query.path;
    try {
        const versions = await History.find({ filename: filePath }).sort({ timestamp: -1 }).limit(20);
        res.json(versions);
    } catch (err) { res.status(500).json({ error: 'History fetch failed' }); }
});

app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));