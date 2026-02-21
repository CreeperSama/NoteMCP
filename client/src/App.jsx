import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import {
  Search,
  FilePlus,
  FolderPlus,
  Download,
  X,
  LayoutGrid,
  History as HistoryIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Network
} from 'lucide-react';
import Editor from './Editor';
import FileTreeItem from './FileTree';
import CanvasEditor from './CanvasEditor';

const stripHtml = (html) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const extractTitle = (htmlContent) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const h1 = doc.querySelector('h1');
  return h1 ? h1.innerText.trim() : null;
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const API_URL = 'http://localhost:5000/api';

const App = () => {
  const [fileTree, setFileTree] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Saved');
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, path: null, type: null });
  const [fileLoadKey, setFileLoadKey] = useState(0);

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`);
      setFileTree(res.data);
    } catch (e) { console.error("Fetch error", e); }
  };

  const handleFileClick = async (path) => {
    try {
      const res = await axios.get(`${API_URL}/file?path=${encodeURIComponent(path)}`);
      setActiveFile(path);
      setContent(res.data.content);
      setFileLoadKey(Date.now());
      setStatus('Saved');
    } catch (e) { console.error("Read error", e); }
  };

  const handleDeleteClick = (path, type) => {
    setDeleteModal({ isOpen: true, path, type });
  };

  const confirmDelete = async () => {
    const { path, type } = deleteModal;
    if (!path) return;

    try {
      await axios.post(`${API_URL}/delete`, { path });
      if (activeFile === path || (type === 'directory' && activeFile?.startsWith(path))) {
        setActiveFile(null);
        setContent('');
      }
      if (selectedFolder === path) setSelectedFolder(null);
      fetchFiles();
    } catch (e) {
      console.error("Delete error", e);
      alert("Failed to delete item.");
    } finally {
      setDeleteModal({ isOpen: false, path: null, type: null });
    }
  };

  // UPDATED: Now supports auto-renaming for BOTH notes and canvas files
  const debouncedSave = useCallback(
    debounce(async (currentPath, newContent) => {
      if (!currentPath) return;
      setStatus('Saving...');
      let finalPath = currentPath;

      let newTitle = null;
      let fileExt = '.md';

      if (currentPath.endsWith('.md')) {
        newTitle = extractTitle(newContent);
        fileExt = '.md';
      } else if (currentPath.endsWith('.canvas')) {
        try {
          const parsed = JSON.parse(newContent);
          newTitle = parsed.title?.trim();
          fileExt = '.canvas';
        } catch (e) { }
      }

      if (newTitle) {
        const pathParts = currentPath.split(/[/\\]/);
        const oldFileName = pathParts.pop();
        const folderPath = pathParts.join('/');

        const potentialFileName = `${newTitle}${fileExt}`;
        const potentialNewPath = folderPath ? `${folderPath}/${potentialFileName}` : potentialFileName;

        if (potentialFileName !== oldFileName && newTitle.length > 0) {
          try {
            await axios.post(`${API_URL}/rename`, { oldPath: currentPath, newPath: potentialNewPath });
            finalPath = potentialNewPath;
            setActiveFile(prev => prev === currentPath ? finalPath : prev);
            await fetchFiles();
          } catch (err) { console.warn("Rename skipped"); }
        }
      }

      try {
        await axios.post(`${API_URL}/save`, { path: finalPath, content: newContent });
        setStatus('Saved');
      } catch (e) { setStatus('Error'); }
    }, 1000), []
  );

  const createNewFile = async () => {
    const name = `Note-${Date.now()}.md`;
    const finalPath = selectedFolder ? `${selectedFolder}/${name}` : name;
    try {
      await axios.post(`${API_URL}/save`, { path: finalPath, content: '<h1>New Note</h1>' });
      await fetchFiles();
      handleFileClick(finalPath);
    } catch (e) { console.error(e); }
  };

  const createNewCanvas = async () => {
    const name = `Board-${Date.now()}.canvas`;
    const finalPath = selectedFolder ? `${selectedFolder}/${name}` : name;
    const initialContent = JSON.stringify({ title: 'New Board', nodes: [], edges: [] });
    try {
      await axios.post(`${API_URL}/save`, { path: finalPath, content: initialContent });
      await fetchFiles();
      handleFileClick(finalPath);
    } catch (e) { console.error(e); }
  };

  const createNewFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const finalPath = selectedFolder ? `${selectedFolder}/${name}` : name;
    try {
      await axios.post(`${API_URL}/folder`, { path: finalPath });
      fetchFiles();
    } catch (e) { console.error(e); }
  };

  const openHistory = async () => {
    if (!activeFile) return;
    try {
      const res = await axios.get(`${API_URL}/history?path=${encodeURIComponent(activeFile)}`);
      setHistoryList(res.data);
      setShowHistory(true);
    } catch (e) { console.error(e); }
  };

  const handleDownloadPDF = () => {
    if (activeFile?.endsWith('.canvas')) {
      alert("PDF download is not supported for Canvas files yet.");
      return;
    }
    const element = document.getElementById('print-area');
    const editorContent = element?.querySelector('.ProseMirror');
    if (!element) return;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: activeFile ? activeFile.split(/[/\\]/).pop().replace('.md', '.pdf') : 'note.pdf',
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    element.style.backgroundColor = 'white';
    element.style.color = 'black';
    if (editorContent) editorContent.classList.add('prose', 'text-black');

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.backgroundColor = '';
      element.style.color = '';
      if (editorContent) editorContent.classList.remove('prose', 'text-black');
    });
  };

  return (
    <div className="flex h-screen w-full bg-obsidian-base text-obsidian-text font-sans overflow-hidden relative">
      <div className="w-12 flex flex-col items-center py-4 border-r border-obsidian-border bg-[#161616] z-20">
        <div onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 mb-4 hover:bg-white/10 rounded cursor-pointer text-obsidian-muted">
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </div>
        <div className="p-2 hover:bg-white/10 rounded cursor-pointer text-obsidian-muted"><Search size={20} /></div>
      </div>

      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex flex-col border-r border-obsidian-border bg-obsidian-base overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-border/50 min-w-[250px]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-obsidian-muted uppercase tracking-widest">Explorer</span>
            {selectedFolder && <span className="text-[9px] text-obsidian-accent truncate max-w-[120px]">Target: {selectedFolder.split(/[/\\]/).pop()}/</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={createNewFile} title="New Note" className="p-1 hover:bg-white/10 rounded"><FilePlus size={16} /></button>
            <button onClick={createNewCanvas} title="New Canvas" className="p-1 hover:bg-white/10 rounded"><Network size={16} /></button>
            <button onClick={createNewFolder} title="New Folder" className="p-1 hover:bg-white/10 rounded"><FolderPlus size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 min-w-[250px]">
          {fileTree.map((item) => (
            <FileTreeItem
              key={item.path}
              item={item}
              level={0}
              onFileClick={handleFileClick}
              onFolderClick={(path) => setSelectedFolder(path)}
              onDelete={handleDeleteClick}
              selectedPath={activeFile}
              selectedFolder={selectedFolder}
            />
          ))}
          <div className="h-20" onClick={() => setSelectedFolder(null)}></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-obsidian-dark transition-all duration-300">
        <div className="h-10 flex items-center justify-between px-6 border-b border-obsidian-border bg-obsidian-base">
          <span className="text-xs font-mono text-obsidian-muted truncate max-w-[300px]">{activeFile || 'No file selected'}</span>
          <div className="flex items-center space-x-4">
            {activeFile && (
              <>
                <button onClick={handleDownloadPDF} className="flex items-center text-xs text-obsidian-muted hover:text-white"><Download size={14} className="mr-1" /> PDF</button>
                {!activeFile.endsWith('.canvas') && (
                  <button onClick={openHistory} className="flex items-center text-xs text-obsidian-muted hover:text-white"><HistoryIcon size={14} className="mr-1" /> History</button>
                )}
              </>
            )}
            <span className="text-xs text-obsidian-muted w-16 text-right">{status}</span>
          </div>
        </div>

        <div className={`flex-1 relative ${activeFile?.endsWith('.canvas') ? 'overflow-hidden' : 'overflow-y-auto px-12 py-8'}`}>
          {activeFile ? (
            activeFile.endsWith('.canvas') ? (
              <CanvasEditor
                initialContent={content}
                fileLoadKey={fileLoadKey}
                onSave={(newContent) => debouncedSave(activeFile, newContent)}
              />
            ) : (
              <Editor
                initialContent={content}
                fileName={activeFile.split(/[/\\]/).pop()}
                fileLoadKey={fileLoadKey}
                onSave={(newContent) => debouncedSave(activeFile, newContent)}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-obsidian-muted space-y-4">
              <LayoutGrid size={48} className="opacity-20" />
              <p className="text-sm">Select a note or create a new one to begin</p>
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="absolute inset-0 bg-black/60 flex justify-end z-40 backdrop-blur-sm">
          <div className="w-96 bg-obsidian-base border-l border-obsidian-border h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-obsidian-border flex justify-between items-center">
              <h2 className="font-bold text-sm uppercase tracking-widest">History</h2>
              <button onClick={() => setShowHistory(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyList.map((ver) => (
                <div key={ver._id} className="p-3 bg-obsidian-dark rounded border border-obsidian-border">
                  <div className="text-[10px] text-obsidian-muted mb-2 flex justify-between">
                    <span>{new Date(ver.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-gray-400 line-clamp-3 mb-3">
                    {stripHtml(ver.content).substring(0, 150)}...
                  </div>
                  <button onClick={() => { setContent(ver.content); setFileLoadKey(Date.now()); setShowHistory(false); }} className="w-full py-1.5 text-[10px] bg-obsidian-accent/10 text-obsidian-accent rounded">Restore</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-obsidian-border rounded-lg shadow-2xl p-6 w-96 max-w-[90%] transform transition-all">
            <h2 className="text-lg font-bold text-white mb-2">Confirm Deletion</h2>
            <p className="text-sm text-obsidian-muted mb-6">
              Are you sure you want to delete this {deleteModal.type === 'directory' ? 'folder and everything inside it' : 'file'}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, path: null, type: null })}
                className="px-4 py-2 text-sm rounded hover:bg-white/5 text-obsidian-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;