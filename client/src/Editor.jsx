import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    useEditor,
    EditorContent,
    NodeViewWrapper,
    ReactNodeViewRenderer,
    mergeAttributes
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Handle,
    Position,
    ConnectionMode,
    MarkerType,
    NodeToolbar
} from 'reactflow';
import 'reactflow/dist/style.css';

// ------------------------------------------------------------------
// 1. EMBEDDED CANVAS COMPONENTS (For inside the note)
// ------------------------------------------------------------------

const CARD_COLORS = [
    { id: 'default', class: 'bg-obsidian-border', bg: 'bg-[#1e1e1e]' },
    { id: 'gradient-1', class: 'bg-gradient-to-r from-purple-500 to-cyan-500', bg: 'bg-[#1e1e1e]' },
    { id: 'gradient-2', class: 'bg-gradient-to-r from-pink-500 to-orange-400', bg: 'bg-[#1e1e1e]' },
    { id: 'red', class: 'bg-red-500', bg: 'bg-[#2a1616]' },
    { id: 'blue', class: 'bg-blue-500', bg: 'bg-[#161f2a]' },
    { id: 'green', class: 'bg-emerald-500', bg: 'bg-[#162a1e]' }
];

const EmbeddedCardNode = ({ id, data, selected }) => {
    const [showPalette, setShowPalette] = useState(false);
    const activeColor = CARD_COLORS.find(c => c.id === data.colorId) || CARD_COLORS[0];

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10} className="hide-on-print">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex space-x-1 bg-[#1e1e1e] border border-obsidian-border rounded-lg p-1.5 shadow-2xl">
                        <button onClick={() => data.onDelete(id)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-red-400 rounded transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                        <button onClick={() => setShowPalette(!showPalette)} className={`p-1.5 hover:bg-white/10 rounded transition-colors ${showPalette ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
                        </button>
                    </div>
                    {showPalette && (
                        <div className="flex space-x-2 bg-[#1e1e1e] border border-obsidian-border rounded-lg p-2 shadow-2xl">
                            {CARD_COLORS.map((c) => (
                                <button key={c.id} onClick={() => { data.onChangeColor(id, c.id); setShowPalette(false); }} className={`w-5 h-5 rounded-full border-2 ${c.class} ${data.colorId === c.id ? 'border-white' : 'border-transparent'}`} />
                            ))}
                        </div>
                    )}
                </div>
            </NodeToolbar>

            <div className={`p-[2px] rounded-xl shadow-xl transition-all ${activeColor.class}`}>
                <div className={`rounded-lg min-w-[200px] min-h-[100px] flex flex-col group ${activeColor.bg}`}>
                    <Handle type="source" id="top" position={Position.Top} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity hide-on-print" />
                    <Handle type="source" id="left" position={Position.Left} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity hide-on-print" />

                    <div className="h-6 bg-black/20 rounded-t-lg cursor-grab active:cursor-grabbing border-b border-white/5 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Card</span>
                    </div>

                    <div className="flex-1 p-3 flex flex-col nodrag cursor-text">
                        <textarea
                            className="flex-1 bg-transparent w-full resize-none outline-none text-sm font-sans text-gray-200"
                            defaultValue={data.label}
                            onChange={(e) => data.onChange(id, e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Type something..."
                        />
                    </div>

                    <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity hide-on-print" />
                    <Handle type="source" id="right" position={Position.Right} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity hide-on-print" />
                </div>
            </div>
        </>
    );
};

const nodeTypes = { card: EmbeddedCardNode };

const EmbeddedCanvas = ({ node, updateAttributes }) => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [title, setTitle] = useState('');
    const [rfInstance, setRfInstance] = useState(null);
    const isInitialized = useRef(false);

    const handleNodeTextChange = useCallback((id, newText) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: newText } } : n)), []);
    const handleNodeColorChange = useCallback((id, newColorId) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, colorId: newColorId } } : n)), []);
    const handleDeleteNode = useCallback((id) => {
        setNodes((nds) => nds.filter(n => n.id !== id));
        setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
    }, []);

    useEffect(() => {
        isInitialized.current = false;
        try {
            const data = JSON.parse(node.attrs.canvasData);
            const loadedNodes = (data.nodes || []).map(n => ({
                ...n, data: { ...n.data, onChange: handleNodeTextChange, onChangeColor: handleNodeColorChange, onDelete: handleDeleteNode }
            }));
            setNodes(loadedNodes);
            setEdges(data.edges || []);
            setTitle(data.title || '');
        } catch (e) { console.warn("Could not parse data"); }
        setTimeout(() => { isInitialized.current = true; }, 100);
    }, [node.attrs.canvasData, handleNodeTextChange, handleNodeColorChange, handleDeleteNode]);

    useEffect(() => {
        if (!isInitialized.current) return;
        const cleanNodes = nodes.map(n => ({ ...n, data: { label: n.data.label, colorId: n.data.colorId || 'default' } }));
        const json = JSON.stringify({ title, nodes: cleanNodes, edges });
        updateAttributes({ canvasData: json });
    }, [nodes, edges, title, updateAttributes]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onConnect = useCallback((params) => {
        const newEdge = {
            ...params, id: `edge_${Date.now()}`, animated: false,
            style: { stroke: '#8c8c8c', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#8c8c8c' },
        };
        setEdges((eds) => [...eds, newEdge]);
    }, []);

    // --- NEW: ALT + DRAG TO DUPLICATE LOGIC ---
    const onNodeDragStart = useCallback((event, dragNode) => {
        if (event.altKey) {
            const duplicateNode = {
                ...dragNode,
                id: `node_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                selected: false,
                position: { x: dragNode.position.x, y: dragNode.position.y },
                data: {
                    ...dragNode.data,
                    onChange: handleNodeTextChange,
                    onChangeColor: handleNodeColorChange,
                    onDelete: handleDeleteNode
                }
            };
            setNodes((nds) => [...nds, duplicateNode]);
        }
    }, [handleNodeTextChange, handleNodeColorChange, handleDeleteNode]);

    const addCard = () => {
        const newNode = {
            id: `node_${Date.now()}`, type: 'card', position: { x: 50, y: 50 },
            data: { label: '', colorId: 'default', onChange: handleNodeTextChange, onChangeColor: handleNodeColorChange, onDelete: handleDeleteNode },
        };
        setNodes((nds) => [...nds, newNode]);
    };

    return (
        <NodeViewWrapper className="w-full h-[500px] border border-obsidian-border rounded-lg my-6 overflow-hidden relative shadow-xl print-canvas-container" style={{ backgroundColor: '#0f0f0f' }}>
            <div className="absolute top-4 left-4 z-10 flex space-x-2 hide-on-print">
                <button onClick={addCard} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded shadow-lg border border-obsidian-border text-xs font-bold uppercase tracking-wider transition-colors">+ Add Card</button>
            </div>

            <div className="absolute top-4 right-4 z-10 w-1/3 hide-on-print">
                <input
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Embedded Canvas Title..."
                    className="w-full bg-transparent text-white text-lg font-bold outline-none placeholder-obsidian-muted/40 text-right print-text-white"
                />
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={onNodeDragStart} // <--- NEW: Hook up the event handler
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                connectionMode={ConnectionMode.Loose}
                fitView
                minZoom={0.1}
                maxZoom={2}
            >
                <Background color="#333" gap={20} size={2} className="hide-on-print" />
                <Controls className="!bg-[#1e1e1e] !border-obsidian-border !fill-white shadow-xl rounded overflow-hidden hide-on-print" />
            </ReactFlow>
        </NodeViewWrapper>
    );
};

// 2. TIPTAP EXTENSION
const CanvasBlockExtension = Node.create({
    name: 'canvasBlock', group: 'block', atom: true,
    addAttributes() { return { canvasData: { default: JSON.stringify({ title: '', nodes: [], edges: [] }) } } },
    parseHTML() { return [{ tag: 'div[data-type="canvas-block"]' }] },
    renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'canvas-block' })] },
    addNodeView() { return ReactNodeViewRenderer(EmbeddedCanvas) }
});

// ------------------------------------------------------------------
// 3. MAIN EDITOR COMPONENT
// ------------------------------------------------------------------

const Editor = ({ initialContent, fileName, fileLoadKey, onSave }) => {
    const onSaveRef = useRef(onSave);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

    const editor = useEditor({
        extensions: [StarterKit, CanvasBlockExtension],
        content: initialContent || '',
        editorProps: { attributes: { class: 'prose prose-invert max-w-none focus:outline-none text-obsidian-text text-lg leading-relaxed min-h-[500px] p-4' } },
        onUpdate: ({ editor }) => onSaveRef.current(editor.getHTML()),
    });

    useEffect(() => {
        if (editor && initialContent !== undefined) {
            editor.commands.setContent(initialContent);
        }
    }, [editor, fileLoadKey]);

    const handlePrint = () => {
        window.print();
    };

    if (!editor) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 pb-20 relative">
            <div className="mb-6 flex justify-between items-end border-b border-obsidian-border pb-2 hide-on-print">
                <div className="text-[10px] text-obsidian-muted uppercase tracking-[0.2em] font-bold">
                    Editing / <span className="text-obsidian-accent">{fileName || 'Untitled'}</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-3 py-1 bg-gray-700 text-white hover:bg-gray-600 rounded text-xs font-bold transition-colors"
                    >
                        Export PDF
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().insertContent({ type: 'canvasBlock' }).run()}
                        className="px-3 py-1 bg-obsidian-accent/10 text-obsidian-accent hover:bg-obsidian-accent/20 rounded text-xs font-bold transition-colors"
                    >
                        + Insert Canvas Block
                    </button>
                </div>
            </div>

            <div id="print-area" className="relative bg-[#0f0f0f] rounded-lg">
                <EditorContent editor={editor} />
            </div>

            {/* MAGIC CSS FOR PRINTING */}
            <style>{`
              @media print {
                /* Hide everything outside the editor */
                body * { visibility: hidden; }
                
                /* Show only our print area */
                #print-area, #print-area * { visibility: visible; }
                
                #print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: #0f0f0f !important;
                }

                /* Force backgrounds and gradients to render in the PDF */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }

                /* Hide UI elements we don't want in the PDF */
                .hide-on-print, 
                .react-flow__controls, 
                .react-flow__background, 
                .react-flow__panel,
                .tippy-box {
                  display: none !important;
                }

                /* Ensure textarea text renders well */
                textarea {
                  resize: none !important;
                  border: none !important;
                  overflow: hidden !important;
                  color: white !important;
                }
              }
            `}</style>
        </div>
    );
};

export default Editor;