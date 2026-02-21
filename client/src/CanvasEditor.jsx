import React, { useState, useCallback, useRef, useEffect } from 'react';
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
// 1. CONSTANTS & CUSTOM NODE
// ------------------------------------------------------------------

const CARD_COLORS = [
    { id: 'default', class: 'bg-obsidian-border', bg: 'bg-[#1e1e1e]' },
    { id: 'gradient-1', class: 'bg-gradient-to-r from-purple-500 to-cyan-500', bg: 'bg-[#1e1e1e]' },
    { id: 'gradient-2', class: 'bg-gradient-to-r from-pink-500 to-orange-400', bg: 'bg-[#1e1e1e]' },
    { id: 'red', class: 'bg-red-500', bg: 'bg-[#2a1616]' },
    { id: 'blue', class: 'bg-blue-500', bg: 'bg-[#161f2a]' },
    { id: 'green', class: 'bg-emerald-500', bg: 'bg-[#162a1e]' }
];

const CardNode = ({ id, data, selected }) => {
    const [showPalette, setShowPalette] = useState(false);
    const activeColor = CARD_COLORS.find(c => c.id === data.colorId) || CARD_COLORS[0];

    return (
        <>
            {/* FLOATING TOOLBAR */}
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <div className="flex flex-col items-center gap-2">
                    <div className="flex space-x-1 bg-[#1e1e1e] border border-obsidian-border rounded-lg p-1.5 shadow-2xl">
                        <button
                            onClick={() => data.onDelete(id)}
                            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-red-400 rounded transition-colors"
                            title="Delete Card"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                        <button
                            onClick={() => setShowPalette(!showPalette)}
                            className={`p-1.5 hover:bg-white/10 rounded transition-colors ${showPalette ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                            title="Change Color"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
                        </button>
                    </div>

                    {showPalette && (
                        <div className="flex space-x-2 bg-[#1e1e1e] border border-obsidian-border rounded-lg p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                            {CARD_COLORS.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        data.onChangeColor(id, c.id);
                                        setShowPalette(false);
                                    }}
                                    className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-transform hover:scale-110 ${c.class} ${data.colorId === c.id ? 'border-white' : 'border-transparent'}`}
                                    title={c.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </NodeToolbar>

            {/* CARD BODY */}
            <div className={`p-[2px] rounded-xl shadow-xl transition-all ${activeColor.class}`}>
                <div className={`rounded-lg min-w-[200px] min-h-[100px] flex flex-col group ${activeColor.bg} transition-colors duration-300`}>
                    <Handle type="source" id="top" position={Position.Top} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Handle type="source" id="left" position={Position.Left} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity" />

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

                    <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Handle type="source" id="right" position={Position.Right} className="!bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </>
    );
};

const nodeTypes = { card: CardNode };

// ------------------------------------------------------------------
// 2. MAIN CANVAS EDITOR COMPONENT
// ------------------------------------------------------------------

const CanvasEditor = ({ initialData, onSave }) => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const [menu, setMenu] = useState(null);

    // Callbacks for updating node data
    const handleNodeTextChange = useCallback((id, newText) => {
        setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: newText } } : n));
    }, []);

    const handleNodeColorChange = useCallback((id, newColorId) => {
        setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, colorId: newColorId } } : n));
    }, []);

    const handleDeleteNode = useCallback((id) => {
        setNodes((nds) => nds.filter(n => n.id !== id));
        setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
    }, []);

    // Load initial data
    useEffect(() => {
        if (initialData) {
            const loadedNodes = (initialData.nodes || []).map(n => ({
                ...n,
                data: {
                    ...n.data,
                    onChange: handleNodeTextChange,
                    onChangeColor: handleNodeColorChange,
                    onDelete: handleDeleteNode
                }
            }));
            setNodes(loadedNodes);
            setEdges(initialData.edges || []);
        }
    }, [initialData, handleNodeTextChange, handleNodeColorChange, handleDeleteNode]);

    // Auto-save when nodes or edges change
    useEffect(() => {
        if (onSave && nodes.length > 0) {
            const cleanNodes = nodes.map(n => ({
                ...n,
                data: { label: n.data.label, colorId: n.data.colorId || 'default' }
            }));
            onSave({ nodes: cleanNodes, edges });
        }
    }, [nodes, edges, onSave]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onConnect = useCallback((params) => {
        const newEdge = {
            ...params,
            id: `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            animated: false,
            style: { stroke: '#8c8c8c', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#8c8c8c' },
        };
        setEdges((eds) => [...eds, newEdge]);
    }, []);

    // --- NEW: ALT + DRAG TO DUPLICATE LOGIC ---
    const onNodeDragStart = useCallback((event, node) => {
        // Check if the user is holding down the Alt (or Option on Mac) key
        if (event.altKey) {
            const duplicateNode = {
                ...node,
                id: `node_${Date.now()}_${Math.random().toString(36).substring(7)}`, // generate new unique ID
                selected: false, // ensure the duplicate isn't selected immediately
                position: { x: node.position.x, y: node.position.y }, // drop it precisely where the original started
                data: {
                    ...node.data,
                    // We must re-bind the functions so the clone works properly
                    onChange: handleNodeTextChange,
                    onChangeColor: handleNodeColorChange,
                    onDelete: handleDeleteNode
                }
            };
            // Add the duplicate node to the canvas
            setNodes((nds) => [...nds, duplicateNode]);
        }
    }, [handleNodeTextChange, handleNodeColorChange, handleDeleteNode]);

    // Context Menu Logic
    const onPaneContextMenu = useCallback((event) => {
        event.preventDefault();
        setMenu({ isOpen: true, x: event.clientX, y: event.clientY, type: 'pane' });
    }, []);

    const closeMenu = useCallback(() => setMenu(null), []);

    const handleAddCardFromMenu = () => {
        const position = rfInstance
            ? rfInstance.screenToFlowPosition({ x: menu.x, y: menu.y })
            : { x: 100, y: 100 };

        const newNode = {
            id: `node_${Date.now()}`,
            type: 'card',
            position,
            data: {
                label: '',
                colorId: 'default',
                onChange: handleNodeTextChange,
                onChangeColor: handleNodeColorChange,
                onDelete: handleDeleteNode
            },
        };
        setNodes((nds) => [...nds, newNode]);
        closeMenu();
    };

    const addCard = () => {
        const newNode = {
            id: `node_${Date.now()}`,
            type: 'card',
            position: { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 50 },
            data: {
                label: '',
                colorId: 'default',
                onChange: handleNodeTextChange,
                onChangeColor: handleNodeColorChange,
                onDelete: handleDeleteNode
            },
        };
        setNodes((nds) => [...nds, newNode]);
    };

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: '#0f0f0f' }}>
            {/* Top Left Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex space-x-2">
                <button
                    onClick={addCard}
                    className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded shadow-lg border border-obsidian-border text-xs font-bold uppercase tracking-wider transition-colors"
                >
                    + Add Card
                </button>
            </div>

            {/* Pane Context Menu */}
            {menu && menu.isOpen && (
                <div style={{ top: menu.y, left: menu.x }} className="fixed z-50 bg-[#2a2a2a] border border-obsidian-border rounded shadow-xl py-1 w-36 flex flex-col">
                    {menu.type === 'pane' && (
                        <button onClick={handleAddCardFromMenu} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-obsidian-accent/20 transition-colors">New Card</button>
                    )}
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={onNodeDragStart} // <--- NEW: Hook up the event handler
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={closeMenu}
                onNodeClick={closeMenu}
                onEdgeClick={closeMenu}
                connectionMode={ConnectionMode.Loose}
                fitView
                minZoom={0.1}
                maxZoom={2}
            >
                <Background color="#333" gap={20} size={2} />
                <Controls className="!bg-[#1e1e1e] !border-obsidian-border !fill-white shadow-xl rounded overflow-hidden" />
            </ReactFlow>
        </div>
    );
};

export default CanvasEditor;