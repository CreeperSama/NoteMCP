import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const Editor = ({ initialContent, fileName, fileLoadKey, onSave }) => {
    const onSaveRef = useRef(onSave);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    const editor = useEditor({
        extensions: [StarterKit],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onSaveRef.current(editor.getHTML());
        },
    });

    // THE FIX: We ONLY force the editor to update when a new file is explicitly loaded
    useEffect(() => {
        if (editor && initialContent !== undefined) {
            editor.commands.setContent(initialContent);
        }
    }, [editor, fileLoadKey]); // <--- Depends on the unique key now!

    if (!editor) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 pb-20">
            <div className="mb-6 text-[10px] text-obsidian-muted uppercase tracking-[0.2em] font-bold border-b border-obsidian-border pb-2">
                Editing / <span className="text-obsidian-accent">{fileName || 'Untitled'}</span>
            </div>

            <div id="print-area">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default Editor;