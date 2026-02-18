import React, { useState } from 'react';
import {
  Folder, Search, Bookmark, Settings,
  FilePlus, FolderPlus, FileText,
  MoreVertical, X, ChevronRight, LayoutGrid
} from 'lucide-react';
import Editor from './Editor';

const App = () => {
  // Mock State for files
  const [files, setFiles] = useState([
    { id: 1, name: 'Untitled', active: true },
    { id: 2, name: 'Project Ideas', active: false },
    { id: 3, name: 'Meeting Notes', active: false },
    { id: 4, name: 'Welcome', active: false },
  ]);

  return (
    <div className="flex h-screen w-full bg-obsidian-base text-obsidian-text font-sans overflow-hidden">

      {/* 1. FAR LEFT STRIP (Global Tools) */}
      <div className="w-12 flex flex-col items-center py-4 border-r border-obsidian-border space-y-6 bg-[#161616]">
        <div className="p-2 rounded-md hover:bg-white/10 cursor-pointer" title="Files"><LayoutGrid size={20} className="text-obsidian-muted" /></div>
        <div className="p-2 rounded-md hover:bg-white/10 cursor-pointer" title="Search"><Search size={20} className="text-obsidian-muted" /></div>
        <div className="p-2 rounded-md hover:bg-white/10 cursor-pointer" title="Bookmarks"><Bookmark size={20} className="text-obsidian-muted" /></div>
        <div className="mt-auto p-2 rounded-md hover:bg-white/10 cursor-pointer" title="Settings"><Settings size={20} className="text-obsidian-muted" /></div>
      </div>

      {/* 2. SIDEBAR (File Explorer) */}
      <div className="w-64 flex flex-col border-r border-obsidian-border bg-obsidian-base">
        {/* Sidebar Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-border/50">
          <span className="text-xs font-bold tracking-widest text-obsidian-muted uppercase">Explorer</span>
          <div className="flex space-x-1 text-obsidian-muted">
            <button className="p-1 hover:bg-white/10 rounded" title="New File"><FilePlus size={16} /></button>
            <button className="p-1 hover:bg-white/10 rounded" title="New Folder"><FolderPlus size={16} /></button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto py-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center px-4 py-1.5 cursor-pointer text-sm transition-colors ${file.active
                ? 'bg-obsidian-accent/20 text-white border-l-2 border-obsidian-accent'
                : 'text-obsidian-muted hover:bg-obsidian-hover border-l-2 border-transparent'
                }`}
            >
              <FileText size={16} className="mr-2 opacity-70" />
              {file.name}
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN EDITOR AREA */}
      <div className="flex-1 flex flex-col bg-obsidian-dark">

        {/* Tab Bar */}
        <div className="flex items-center bg-obsidian-base border-b border-black select-none">
          <div className="flex items-center px-4 py-2 bg-obsidian-dark border-t-2 border-obsidian-accent text-sm w-48 justify-between group">
            <span className="font-medium text-white">Untitled</span>
            <X size={14} className="cursor-pointer text-obsidian-muted group-hover:text-white" />
          </div>
          <div className="px-4 py-2 text-obsidian-muted hover:bg-obsidian-hover cursor-pointer" title="New Tab">
            +
          </div>
        </div>

        {/* Breadcrumbs / Note Header */}
        <div className="flex items-center justify-between px-8 py-3 text-obsidian-muted text-sm border-b border-obsidian-border/20">
          <div className="flex items-center space-x-2">
            <Folder size={14} />
            <span>My Vault</span>
            <ChevronRight size={14} />
            <span className="text-white font-medium">Untitled</span>
          </div>
          <div className="flex space-x-4">
            <span className="hover:text-white cursor-pointer text-xs uppercase tracking-wide">Read</span>
            <span className="text-white cursor-pointer text-xs uppercase tracking-wide font-bold border-b border-obsidian-accent">Edit</span>
            <MoreVertical size={16} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* The Writing Canvas */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          {/* Editor Component */}
          <Editor />
        </div>
      </div>
    </div>
  );
};

export default App;