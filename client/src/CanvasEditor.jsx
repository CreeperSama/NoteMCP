import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Handle,
    Position,
    ConnectionMode,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node to act like an Obsidian Canvas Card
const CardNode = ({ id, data }) => {
    return (
        <div className="bg-[#1e1e1e] border border-obsidian-border rounded-lg shadow-xl text-white min-w-[200px] min-h-[100px] flex flex-col group transition-all">
            {/* Changed all handles to "source" so you can start a drag from ANY side.
        ConnectionMode.Loose (in the ReactFlow component below) allows them to act as targets too.
      */}
            <Handle type="source" id="top" position={Position.Top} className="!bg-obsidian-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" id="left" position={Position.Left} className="!bg-obsidian-accent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Drag Handle Top Bar */}
            <div className="h-6 bg-black/40 rounded-t-lg cursor-grab active:cursor-grabbing border-b border-obsidian-border flex items-center justify-center">
                <span className="text-[10px] text-obsidian-muted font-bold tracking-widest uppercase">Card</span>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-3 flex flex-col nodrag cursor-text">
                <textarea
                    className="flex-1 bg-transparent w-full resize-none outline-none text-sm font-sans text-gray-300"
                    defaultValue={data.label}
                    onChange={(e) => data.onChange(id, e.target.value)}
                    placeholder="Type something..."
                />
            </div>

            <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-obsidian-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" id="right" position={Position.Right} className="!bg-obsidian-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const nodeTypes = { card: CardNode };

export default function CanvasEditor({ initialContent, onSave, fileLoadKey }) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [title, setTitle] = useState('');
    const [rfInstance, setRfInstance] = useState(null);
    const [menu, setMenu] = useState(null);

    const isInitialized = useRef(false);

    // Load Initial Content
    useEffect(() => {
        isInitialized.current = false;
        try {
            if (initialContent) {
                const parsed = JSON.parse(initialContent);
                const loadedNodes = (parsed.nodes || []).map(n => ({
                    ...n,
                    data: { ...n.data, onChange: handleNodeTextChange }
                }));
                setNodes(loadedNodes);
                setEdges(parsed.edges || []);
                setTitle(parsed.title || '');
            } else {
                setNodes([]);
                setEdges([]);
                setTitle('');
            }
        } catch (e) {
            console.error("Failed to parse canvas data", e);
        }
        setTimeout(() => { isInitialized.current = true; }, 500);
    }, [initialContent, fileLoadKey]);

    // Handle live typing inside a card
    const handleNodeTextChange = useCallback((id, newText) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, label: newText } };
                }
                return node;
            })
        );
    }, []);

    // Auto-save logic
    useEffect(() => {
        if (!isInitialized.current) return;
        const cleanNodes = nodes.map(n => ({
            ...n,
            data: { label: n.data.label }
        }));
        const json = JSON.stringify({ title, nodes: cleanNodes, edges });
        onSave(json);
    }, [nodes, edges, title, onSave]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    // Connection Handler
    const onConnect = useCallback((params) => {
        const newEdge = {
            ...params,
            id: `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            animated: false,
            style: { stroke: '#8c8c8c', strokeWidth: 2 },
            // Added arrowhead so you can see when lines go back and forth
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#8c8c8c',
            },
        };
        setEdges((eds) => [...eds, newEdge]);
    }, []);

    // --- RIGHT CLICK MENU LOGIC ---
    const onPaneContextMenu = useCallback((event) => {
        event.preventDefault();
        setMenu({ isOpen: true, x: event.clientX, y: event.clientY, type: 'pane' });
    }, []);

    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setMenu({ isOpen: true, x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
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
            data: { label: '', onChange: handleNodeTextChange },
        };
        setNodes((nds) => [...nds, newNode]);
        closeMenu();
    };

    const handleDeleteNodeFromMenu = () => {
        setNodes((nds) => nds.filter(n => n.id !== menu.nodeId));
        setEdges((eds) => eds.filter(e => e.source !== menu.nodeId && e.target !== menu.nodeId));
        closeMenu();
    };

    const addCard = () => {
        const newNode = {
            id: `node_${Date.now()}`,
            type: 'card',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: '', onChange: handleNodeTextChange },
        };
        setNodes((nds) => [...nds, newNode]);
    };

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: '#0f0f0f' }}>

            {/* Top Left Add Card Button */}
            <div className="absolute top-4 left-4 z-10 flex space-x-2">
                <button
                    onClick={addCard}
                    className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded shadow-lg border border-obsidian-border text-xs font-bold uppercase tracking-wider transition-colors"
                >
                    + Add Card
                </button>
            </div>

            {/* Canvas Heading Block */}
            <div className="absolute top-20 left-6 z-10 w-1/2">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled Canvas..."
                    className="w-full bg-transparent text-white text-3xl font-bold outline-none placeholder-obsidian-muted/40"
                />
            </div>

            {/* Custom Context Menu Floating UI */}
            {menu && menu.isOpen && (
                <div
                    style={{ top: menu.y, left: menu.x }}
                    className="fixed z-50 bg-[#2a2a2a] border border-obsidian-border rounded shadow-xl py-1 w-36 flex flex-col"
                >
                    {menu.type === 'pane' && (
                        <button onClick={handleAddCardFromMenu} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-obsidian-accent/20 transition-colors">
                            New Card
                        </button>
                    )}
                    {menu.type === 'node' && (
                        <button onClick={handleDeleteNodeFromMenu} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors">
                            Delete Card
                        </button>
                    )}
                </div>
            )}

            {/* React Flow Workspace */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={closeMenu}
                onNodeClick={closeMenu}
                onEdgeClick={closeMenu}
                connectionMode={ConnectionMode.Loose} // <--- ALLOWS MULTI-DIRECTIONAL & ANY-TO-ANY CONNECTIONS
                fitView
                minZoom={0.1}
                maxZoom={2}
            >
                <Background color="#333" gap={20} size={2} />
                <Controls className="!bg-[#1e1e1e] !border-obsidian-border !fill-white shadow-xl rounded overflow-hidden" />
            </ReactFlow>
        </div>
    );
}