import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const Editor = ({ initialContent, fileName, onSave }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: initialContent || '',
        editorProps: {
            attributes: {
                // prose-invert is for Dark Mode; the PDF function swaps this to 'prose' temporarily
                class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onSave(editor.getHTML());
        },
    });

    // Sync content when clicking different files
    useEffect(() => {
        if (editor && initialContent !== undefined) {
            if (editor.getHTML() !== initialContent) {
                editor.commands.setContent(initialContent);
            }
        }
    }, [initialContent, editor]);

    if (!editor) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 pb-20">
            {/* Visual only - excluded from 'print-area' */}
            <div className="mb-6 text-[10px] text-obsidian-muted uppercase tracking-[0.2em] font-bold border-b border-obsidian-border pb-2">
                Editing / <span className="text-obsidian-accent">{fileName || 'Untitled'}</span>
            </div>

            {/* Only this div is captured in the PDF */}
            <div id="print-area">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default Editor;