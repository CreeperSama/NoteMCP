import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Folder, Search, Bookmark, Settings,
  FilePlus, FolderPlus, FileText,
  MoreVertical, X, ChevronRight, LayoutGrid
} from 'lucide-react';
import Editor from './Editor';

// Simple Debounce Helper: Waits for user to stop typing
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const API_URL = 'http://localhost:5000/api';

const App = () => {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Saved'); // To show "Saving..." status

  // 1. Fetch files on load
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files`);
      setFiles(response.data.map((name, index) => ({ id: index, name })));
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  // 2. Load a file when clicked
  const handleFileClick = async (fileName) => {
    try {
      const response = await axios.get(`${API_URL}/file/${fileName}`);
      setActiveFile(fileName);
      setContent(response.data.content); // Pass this to Editor
      setStatus('Saved');
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  // 3. The actual Save Function (Debounced)
  // This creates a version of the save function that waits 1000ms (1 second)
  const debouncedSave = useCallback(
    debounce(async (fileName, newContent) => {
      if (!fileName) return;

      setStatus('Saving...');
      try {
        await axios.post(`${API_URL}/save`, {
          filename: fileName,
          content: newContent
        });
        setStatus('Saved');
      } catch (error) {
        setStatus('Error!');
        console.error("Save failed:", error);
      }
    }, 1000),
    []
  );

  // 4. Create New File
  const createNewFile = async () => {
    const fileName = `Note-${Date.now()}.md`;
    await axios.post(`${API_URL}/save`, { filename: fileName, content: '<h1>New Note</h1>' });
    await fetchFiles(); // Refresh list
    handleFileClick(fileName); // Open it immediately
  };

  return (
    <div className="flex h-screen w-full bg-obsidian-base text-obsidian-text font-sans overflow-hidden">

      {/* SIDEBAR */}
      <div className="w-64 flex flex-col border-r border-obsidian-border bg-obsidian-base">
        <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-border/50">
          <span className="text-xs font-bold tracking-widest text-obsidian-muted uppercase">Explorer</span>
          <button onClick={createNewFile} className="p-1 hover:bg-white/10 rounded"><FilePlus size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file.name)}
              className={`flex items-center px-4 py-1.5 cursor-pointer text-sm ${activeFile === file.name ? 'bg-obsidian-accent/20 text-white border-l-2 border-obsidian-accent' : 'text-obsidian-muted hover:bg-obsidian-hover'
                }`}
            >
              <FileText size={16} className="mr-2 opacity-70" />
              {file.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN EDITOR */}
      <div className="flex-1 flex flex-col bg-obsidian-dark">
        {/* Status Bar */}
        <div className="h-8 flex items-center justify-end px-4 text-xs text-obsidian-muted border-b border-obsidian-border">
          {status === 'Saving...' ? <span className="text-yellow-500">Saving...</span> : <span>{status}</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-12 py-8">
          {activeFile ? (
            <Editor
              initialContent={content}
              fileName={activeFile}
              onSave={(newContent) => debouncedSave(activeFile, newContent)}
            />
          ) : (
            <div className="text-center mt-20 text-obsidian-muted">Select a file to start writing</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;