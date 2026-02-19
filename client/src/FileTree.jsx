import React from 'react';
import { FileText, Folder, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

const FileTreeItem = ({ item, level, onFileClick, onFolderClick, selectedPath, selectedFolder, onDelete }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isSelected = selectedPath === item.path;
    const isTargetFolder = selectedFolder === item.path;

    const handleToggle = (e) => {
        e.stopPropagation();
        if (item.type === 'directory') {
            setIsOpen(!isOpen);
            onFolderClick(item.path);
        } else {
            onFileClick(item.path);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(item.path, item.type);
    };

    return (
        <div className="select-none">
            <div
                onClick={handleToggle}
                className={`
          group flex items-center py-1 px-2 cursor-pointer rounded-md mx-2 transition-colors
          ${isSelected ? 'bg-obsidian-accent/20 text-obsidian-accent' : 'hover:bg-white/5 text-obsidian-muted hover:text-obsidian-text'}
          ${isTargetFolder && !isSelected ? 'border border-obsidian-accent/30' : 'border border-transparent'}
        `}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                <span className="mr-1.5 opacity-60">
                    {item.type === 'directory' ? (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <FileText size={14} />
                    )}
                </span>

                {item.type === 'directory' && <Folder size={14} className="mr-2 text-obsidian-accent opacity-80" />}
                <span className="text-xs truncate flex-1">{item.name}</span>

                {/* Delete Button - Visible on Hover */}
                <button
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {item.type === 'directory' && isOpen && item.children && (
                <div className="mt-0.5">
                    {item.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onFileClick={onFileClick}
                            onFolderClick={onFolderClick}
                            selectedPath={selectedPath}
                            selectedFolder={selectedFolder}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileTreeItem;