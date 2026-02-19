import React, { useState } from 'react';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

const FileTreeItem = ({ item, level, onFileClick, onFolderClick, selectedPath, selectedFolder }) => {
    const [isOpen, setIsOpen] = useState(false);

    const isFolderSelected = selectedFolder === item.path;
    const isFileSelected = selectedPath === item.path;
    const paddingLeft = `${level * 12 + 12}px`;

    if (item.type === 'folder') {
        return (
            <div>
                <div
                    onClick={() => {
                        setIsOpen(!isOpen);
                        onFolderClick(item.path); // Clicking a folder selects it as the "target"
                    }}
                    className={`flex items-center py-1 cursor-pointer transition-colors select-none ${isFolderSelected ? 'bg-obsidian-accent/10 text-obsidian-accent' : 'text-obsidian-muted hover:bg-white/5 hover:text-white'
                        }`}
                    style={{ paddingLeft }}
                >
                    <span className="mr-1">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="mr-2">
                        {isOpen ? <FolderOpen size={16} className="text-yellow-500" /> : <Folder size={16} className="text-yellow-500" />}
                    </span>
                    <span className="text-sm truncate font-medium">{item.name}</span>
                </div>

                {isOpen && (
                    <div>
                        {item.children.map((child) => (
                            <FileTreeItem
                                key={child.path}
                                item={child}
                                level={level + 1}
                                onFileClick={onFileClick}
                                onFolderClick={onFolderClick}
                                selectedPath={selectedPath}
                                selectedFolder={selectedFolder}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // It's a File
    return (
        <div
            onClick={() => onFileClick(item.path)}
            className={`flex items-center py-1 cursor-pointer transition-colors text-sm ${isFileSelected ? 'bg-obsidian-accent/20 text-white border-l-2 border-obsidian-accent' : 'text-obsidian-muted hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
            style={{ paddingLeft: `${level * 12 + 28}px` }}
        >
            <FileText size={14} className="mr-2 opacity-70" />
            <span className="truncate">{item.name}</span>
        </div>
    );
};

export default FileTreeItem;