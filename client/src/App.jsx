import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import {
  Folder, Search, Bookmark, Settings,
  FilePlus, FolderPlus, FileText,
  MoreVertical, X, ChevronRight, LayoutGrid,
  History as HistoryIcon, Download, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import Editor from './Editor';

// --- HELPER FUNCTIONS ---

// 1. Strip HTML tags for clean History preview
const stripHtml = (html) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// 2. Extract H1 title from content for renaming
const extractTitle = (htmlContent) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const h1 = doc.querySelector('h1');
  return h1 ? h1.innerText.trim() : null;
};

// 3. Debounce Helper (Waits for user to stop typing)
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const API_URL = 'http://localhost:5000/api';

const App = () => {
  // --- STATE ---
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Saved');

  // UI State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // --- EFFECTS ---
  useEffect(() => { fetchFiles(); }, []);

  // --- API HANDLERS ---

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`);
      setFiles(res.data.map((name, i) => ({ id: i, name })));
    } catch (e) { console.error(e); }
  };

  const handleFileClick = async (fileName) => {
    try {
      const res = await axios.get(`${API_URL}/file/${fileName}`);
      setActiveFile(fileName);
      setContent(res.data.content);
      setStatus('Saved');
    } catch (e) { console.error(e); }
  };

  // AUTO-RENAME + SAVE LOGIC
  const debouncedSave = useCallback(
    debounce(async (currentFileName, newContent) => {
      if (!currentFileName) return;
      setStatus('Saving...');

      let finalFileName = currentFileName;

      // Check for renaming (If H1 changed)
      const newTitle = extractTitle(newContent);
      if (newTitle) {
        const potentialName = `${newTitle}.md`;
        // Only rename if the name is different AND valid
        if (potentialName !== currentFileName && newTitle.length > 0) {
          try {
            await axios.post(`${API_URL}/rename`, {
              oldName: currentFileName,
              newName: potentialName
            });
            finalFileName = potentialName;

            // Update UI with new name locally
            setActiveFile(finalFileName);
            setFiles(prev => prev.map(f => f.name === currentFileName ? { ...f, name: finalFileName } : f));
            console.log("Renamed to:", finalFileName);
          } catch (err) {
            console.warn("Could not rename (maybe file exists):", err);
          }
        }
      }

      // Save Content
      try {
        await axios.post(`${API_URL}/save`, { filename: finalFileName, content: newContent });
        setStatus('Saved');
      } catch (e) { setStatus('Error!'); }
    }, 1000), []
  );

  const createNewFile = async () => {
    const fileName = `Untitled-${Date.now()}.md`;
    await axios.post(`${API_URL}/save`, { filename: fileName, content: '<h1>Untitled Note</h1><p>Start writing...</p>' });
    await fetchFiles();
    handleFileClick(fileName);
  };

  // --- HISTORY HANDLERS ---

  const openHistory = async () => {
    if (!activeFile) return;
    try {
      const res = await axios.get(`${API_URL}/history/${activeFile}`);
      setHistoryList(res.data);
      setShowHistory(true);
    } catch (e) { console.error("History error", e); }
  };

  const restoreVersion = (oldContent) => {
    if (confirm("Restore this version?")) {
      setContent(oldContent);
      debouncedSave(activeFile, oldContent);
      setShowHistory(false);
    }
  };

  // --- PDF EXPORT HANDLER ---

  const handleDownloadPDF = () => {
    const element = document.getElementById('print-area');
    // The editor content wrapper (the child of print-area)
    // Note: This relies on the Editor using Prosemirror (TipTap default)
    const editorContent = element.querySelector('.ProseMirror');

    if (!element) {
      alert("Error: Could not find content to print.");
      return;
    }

    // 1. PDF Configuration
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: activeFile ? activeFile.replace('.md', '.pdf') : 'note.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // 2. TEMPORARY STYLING (Dark Mode -> Light Mode)
    // Save original styles
    const originalBg = element.style.backgroundColor;
    const originalColor = element.style.color;

    // Apply "Paper" look to container
    element.style.backgroundColor = 'white';
    element.style.color = 'black';

    // CRITICAL: Swap Tailwind classes on the editor content
    if (editorContent) {
      // Remove Dark Mode classes
      editorContent.classList.remove('prose-invert');
      editorContent.classList.remove('text-obsidian-text');
      // Add Light Mode classes
      editorContent.classList.add('prose');
      editorContent.classList.add('text-black');
    }

    // 3. Generate PDF
    html2pdf().set(opt).from(element).save()
      .then(() => {
        // 4. RESTORE STYLES (Light Mode -> Dark Mode)
        element.style.backgroundColor = originalBg;
        element.style.color = originalColor;

        if (editorContent) {
          editorContent.classList.remove('prose');
          editorContent.classList.remove('text-black');
          editorContent.classList.add('prose-invert');
          editorContent.classList.add('text-obsidian-text');
        }
      })
      .catch(err => {
        console.error("PDF Export Error:", err);
        alert("Failed to export PDF.");
      });
  };

  return (
    <div className="flex h-screen w-full bg-obsidian-base text-obsidian-text font-sans overflow-hidden relative">

      {/* 1. FAR LEFT STRIP */}
      <div className="w-12 flex flex-col items-center py-4 border-r border-obsidian-border space-y-6 bg-[#161616] z-20">
        <div
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md hover:bg-white/10 cursor-pointer text-obsidian-muted"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </div>
        <div className="p-2 rounded-md hover:bg-white/10 cursor-pointer"><Search size={20} className="text-obsidian-muted" /></div>
      </div>

      {/* 2. SIDEBAR (Collapsible) */}
      <div
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out flex flex-col border-r border-obsidian-border bg-obsidian-base overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-border/50 min-w-[250px]">
          <span className="text-xs font-bold tracking-widest text-obsidian-muted uppercase">Explorer</span>
          <button onClick={createNewFile} className="p-1 hover:bg-white/10 rounded"><FilePlus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 min-w-[250px]">
          {files.map((file) => (
            <div key={file.id} onClick={() => handleFileClick(file.name)}
              className={`flex items-center px-4 py-1.5 cursor-pointer text-sm truncate ${activeFile === file.name ? 'bg-obsidian-accent/20 text-white' : 'text-obsidian-muted'}`}>
              <FileText size={16} className="mr-2 opacity-70 flex-shrink-0" /> {file.name}
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN EDITOR */}
      <div className="flex-1 flex flex-col bg-obsidian-dark transition-all duration-300">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-6 border-b border-obsidian-border bg-obsidian-base">
          <span className="text-sm font-medium truncate max-w-[200px]">{activeFile}</span>
          <div className="flex items-center space-x-4">
            {activeFile && (
              <>
                <button onClick={handleDownloadPDF} className="flex items-center text-xs text-obsidian-muted hover:text-white" title="Export to PDF">
                  <Download size={14} className="mr-1" /> PDF
                </button>
                <button onClick={openHistory} className="flex items-center text-xs text-obsidian-muted hover:text-white" title="View History">
                  <HistoryIcon size={14} className="mr-1" /> History
                </button>
              </>
            )}
            <span className="text-xs text-obsidian-muted w-16 text-right">{status}</span>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          {activeFile ? (
            <Editor initialContent={content} fileName={activeFile} onSave={(newContent) => debouncedSave(activeFile, newContent)} />
          ) : <div className="text-center mt-20 text-obsidian-muted">Select a file to start writing</div>}
        </div>
      </div>

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="absolute inset-0 bg-black/60 flex justify-end z-50 backdrop-blur-sm">
          <div className="w-96 bg-obsidian-base border-l border-obsidian-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-obsidian-border flex justify-between items-center">
              <h2 className="font-bold">Version History</h2>
              <button onClick={() => setShowHistory(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyList.map((ver) => (
                <div key={ver._id} className="p-3 bg-obsidian-dark rounded border border-obsidian-border hover:border-obsidian-accent group">
                  <div className="text-xs text-obsidian-muted mb-1 flex justify-between">
                    <span>{new Date(ver.timestamp).toLocaleDateString()}</span>
                    <span>{new Date(ver.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {/* Clean Text Preview */}
                  <div className="text-xs text-gray-400 line-clamp-3 mb-2 font-mono bg-black/30 p-2 rounded">
                    {stripHtml(ver.content).substring(0, 150)}...
                  </div>
                  <button onClick={() => restoreVersion(ver.content)}
                    className="w-full py-1 text-xs bg-obsidian-accent/10 text-obsidian-accent rounded hover:bg-obsidian-accent hover:text-white transition-colors">
                    Restore this version
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;