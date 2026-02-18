import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const Editor = ({ initialContent, fileName, onSave }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: initialContent || '', // Load content if available
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px]',
            },
        },
        // AUTO-SAVE LOGIC
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onSave(html); // Trigger the save function passed from App.jsx
        },
    });

    // WATCH FOR FILE CHANGES
    // When 'initialContent' changes (user clicked a new file), update the editor
    useEffect(() => {
        if (editor && initialContent !== undefined) {
            // We only update if the content is actually different to avoid cursor jumping
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
            {/* Title of the note being edited */}
            <div className="mb-6 text-sm text-obsidian-muted uppercase tracking-widest font-bold">
                Editing: <span className="text-obsidian-accent">{fileName || 'Untitled'}</span>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
};

export default Editor;