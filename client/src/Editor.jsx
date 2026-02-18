import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const Editor = () => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: '<h1>Untitled Note</h1><p>Start writing here...</p>',
        editorProps: {
            attributes: {
                // Tailwind typography classes for the editor content
                class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px]',
            },
        },
    })

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 pb-20">
            <EditorContent editor={editor} />
        </div>
    )
}

export default Editor