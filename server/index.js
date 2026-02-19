const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;
// This tells Node to look in the 'MyVault' folder located in the same directory as index.js
const NOTES_DIR = path.join(__dirname, 'MyVault');

// Log it so you can verify in the terminal when you start the server
console.log("-----------------------------------------");
console.log("📂 Vault Location:", NOTES_DIR);
console.log("-----------------------------------------") // <--- ADD THIS LINE

// --- DATABASE SETUP (For Version History) ---
mongoose.connect('mongodb://127.0.0.1:27017/notemcp')
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

const HistorySchema = new mongoose.Schema({
    path: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Ensure the notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR);
}

// --- HELPER: RECURSIVE FILE TREE ---
const getFileTree = (dir, relativeDir = '') => {
    const files = fs.readdirSync(dir);
    return files.map(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(relativeDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            return {
                name: file,
                path: relativePath,
                type: 'directory',
                children: getFileTree(filePath, relativePath)
            };
        } else {
            return {
                name: file,
                path: relativePath,
                type: 'file'
            };
        }
    });
};

// --- ROUTES ---

// 1. Get entire file tree
app.get('/api/files', (req, res) => {
    try {
        const tree = getFileTree(NOTES_DIR);
        res.json(tree);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Read file content
app.get('/api/file', (req, res) => {
    const filePath = path.join(NOTES_DIR, req.query.path);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content });
    } else {
        res.status(404).send('File not found');
    }
});

// 3. Save file (and create history entry)
app.post('/api/save', async (req, res) => {
    const { path: itemPath, content } = req.body;
    const filePath = path.join(NOTES_DIR, itemPath);

    try {
        // Save to Disk
        fs.writeFileSync(filePath, content);

        // Save to MongoDB History (only if content actually exists)
        if (content && content !== '<h1>New Note</h1>') {
            await History.create({ path: itemPath, content });
        }

        res.json({ message: 'Saved' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Rename File (for auto-rename titles)
app.post('/api/rename', (req, res) => {
    const { oldPath, newPath } = req.body;
    const oldFullPath = path.join(NOTES_DIR, oldPath);
    const newFullPath = path.join(NOTES_DIR, newPath);

    try {
        if (fs.existsSync(oldFullPath)) {
            fs.renameSync(oldFullPath, newFullPath);
            res.json({ message: 'Renamed' });
        } else {
            res.status(404).json({ error: 'Source file not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Create Folder
app.post('/api/folder', (req, res) => {
    const folderPath = path.join(NOTES_DIR, req.body.path);
    try {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            res.json({ message: 'Folder created' });
        } else {
            res.status(400).json({ message: 'Folder already exists' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Delete File or Folder (Recursive)
app.post('/api/delete', (req, res) => {
    const { path: itemPath } = req.body;
    const fullPath = path.join(NOTES_DIR, itemPath);

    try {
        if (fs.existsSync(fullPath)) {
            // rmSync with recursive:true deletes folders + everything inside
            fs.rmSync(fullPath, { recursive: true, force: true });
            res.json({ message: 'Deleted successfully' });
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 7. Get History for a file
app.get('/api/history', async (req, res) => {
    try {
        const versions = await History.find({ path: req.query.path })
            .sort({ timestamp: -1 })
            .limit(10);
        res.json(versions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});