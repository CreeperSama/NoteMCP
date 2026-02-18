import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const Editor = ({ initialContent, fileName, onSave }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onSave(html);
        },
    });

    useEffect(() => {
        if (editor && initialContent !== undefined) {
            if (editor.getHTML() !== initialContent) {
                editor.commands.setContent(initialContent);
            }
        }
    }, [initialContent, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 pb-20">

            {/* 1. TITLE (Outside the Print Area) */}
            {/* This will show on screen, but NOT in the PDF */}
            <div className="mb-6 text-sm text-obsidian-muted uppercase tracking-widest font-bold">
                Editing: <span className="text-obsidian-accent">{fileName || 'Untitled'}</span>
            </div>

            {/* 2. PRINT AREA (The PDF Tool only looks at this div) */}
            <div id="print-area">
                <EditorContent editor={editor} />
            </div>

        </div>
    );
};

export default Editor;