import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Connection,
  Handle
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  FileText, Image, FileSpreadsheet, FileCode, X, Sparkles, Link2
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileRecord } from '../../types';

// Structured columns mapping based on real-world document transaction flow:
// Contract/Syllabus ➔ Bank Statement ➔ Invoice ➔ Receipt
const CATEGORY_COLUMNS: Record<string, number> = {
  'Contract': 0,
  'Resume': 0,
  'College Notes': 0,
  'Tax Document': 1,
  'Bank Statement': 1,
  'Invoice': 2,
  'Receipt': 3,
};

// Premium Glassmorphic Node Component representing individual files
const CustomDocumentNode = ({ data, selected }: any) => {
  const { file, getCategoryColor, formatBytes, isHighlighted } = data;
  
  let Icon = FileText;
  const ext = file.extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
    Icon = Image;
  } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
  } else if (['js', 'ts', 'jsx', 'tsx', 'rs', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) {
    Icon = FileCode;
  }

  const categoryColorClass = getCategoryColor(file.category || 'Other');

  return (
    <div className={`flex flex-col w-56 rounded-xl border p-3 bg-zinc-950/85 text-zinc-300 border-zinc-850 backdrop-blur-md transition-all select-none hover:border-zinc-700/80 ${
      selected ? 'ring-1.5 ring-indigo-500 border-transparent shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-zinc-950' : ''
    } ${!isHighlighted ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}>
      
      {/* Target handle on Left (inbound links) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in"
        className="w-2 h-2 bg-zinc-800 border border-zinc-700 hover:bg-indigo-400 transition-colors z-20" 
      />

      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-1.5 rounded border flex items-center justify-center shrink-0 ${
          selected ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
        }`}>
          <Icon size={13} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-zinc-200 truncate leading-snug mb-0.5" title={file.filename}>
            {file.filename}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-extrabold uppercase font-mono px-1 border rounded leading-none py-0.5 ${categoryColorClass}`}>
              {file.category || 'Unassigned'}
            </span>
            <span className="text-[8px] font-bold text-zinc-550 font-mono">
              {formatBytes(file.size)}
            </span>
          </div>
        </div>
      </div>

      {/* Source handle on Right (outbound links) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="out"
        className="w-2 h-2 bg-zinc-800 border border-zinc-700 hover:bg-indigo-400 transition-colors z-20" 
      />
    </div>
  );
};

// Edge colors based on relationship typings
const EDGE_COLORS: Record<string, string> = {
  'Contract': '#818cf8',    // Indigo
  'Invoice': '#34d399',     // Emerald
  'Receipt': '#fbbf24',     // Amber
  'Statement': '#60a5fa',   // Blue
  'Supporting': '#a78bfa',  // Purple
};

interface GraphViewerProps {
  selectedFile: FileRecord | null;
  setSelectedFile: (file: FileRecord | null) => void;
}

export default function GraphViewer({ selectedFile, setSelectedFile }: GraphViewerProps) {
  const {
    files,
    relationships,
    addRelationship,
    deleteRelationship,
    loadRelationships,
    searchQuery,
    loadRelatedDocs,
    loadRecommendations
  } = useWorkspaceStore();

  // Use all workspace files for the graph
  const displayFiles = files;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [relationshipType, setRelationshipType] = useState('Supporting');

  // Trigger loading relationships on mount
  useEffect(() => {
    loadRelationships();
  }, []);

  // Format helper routines
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Invoice': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Receipt': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Resume': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Tax Document': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Bank Statement': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Contract': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'College Notes': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      default: return 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50';
    }
  };

  const nodeTypes = useMemo(() => ({
    document: CustomDocumentNode
  }), []);

  // Process search query filtering highlighting
  const isMatch = useCallback((file: FileRecord) => {
    if (!searchQuery || searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      file.filename.toLowerCase().includes(query) ||
      (file.category && file.category.toLowerCase().includes(query)) ||
      (file.extension && file.extension.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Compute Layout positions and build ReactFlow Node items
  useEffect(() => {
    // 1. Group files by column index
    const columns: Record<number, FileRecord[]> = { 0: [], 1: [], 2: [], 3: [] };
    
    displayFiles.forEach(file => {
      const colIndex = CATEGORY_COLUMNS[file.category || ''] ?? 1;
      columns[colIndex].push(file);
    });

    // 2. Build nodes with spacing centering
    const newNodes: Node[] = [];
    const columnWidth = 320;
    const verticalGap = 110;
    const canvasHeight = 450;

    Object.entries(columns).forEach(([colKey, colFiles]) => {
      const colIndex = parseInt(colKey);
      const totalHeight = (colFiles.length - 1) * verticalGap;
      const startY = Math.max(50, (canvasHeight - totalHeight) / 2);

      colFiles.forEach((file, index) => {
        newNodes.push({
          id: file.id,
          type: 'document',
          position: {
            x: colIndex * columnWidth + 80,
            y: startY + index * verticalGap
          },
          data: {
            file,
            getCategoryColor,
            formatBytes,
            isHighlighted: isMatch(file)
          },
          selected: selectedFile?.id === file.id
        });
      });
    });

    setNodes(newNodes);
  }, [displayFiles, selectedFile, searchQuery, isMatch, setNodes]);

  // Map database relationship edges
  useEffect(() => {
    const activeFileIds = new Set(displayFiles.map(f => f.id));
    const newEdges: Edge[] = [];

    relationships.forEach(rel => {
      // Ensure source and target files exist in current display list
      if (activeFileIds.has(rel.source_file_id) && activeFileIds.has(rel.target_file_id)) {
        const strokeColor = EDGE_COLORS[rel.relationship_type] || '#a78bfa';
        newEdges.push({
          id: rel.id,
          source: rel.source_file_id,
          target: rel.target_file_id,
          label: rel.relationship_type,
          labelStyle: { fill: '#a1a1aa', fontSize: 8, fontWeight: 'bold', fontFamily: 'monospace' },
          labelBgStyle: { fill: '#09090b', fillOpacity: 0.85, rx: 3 },
          style: { stroke: strokeColor, strokeWidth: 2, strokeDasharray: '3 3' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14
          }
        });
      }
    });

    setEdges(newEdges);
  }, [relationships, displayFiles, setEdges]);

  // Node interaction selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const file = displayFiles.find(f => f.id === node.id);
    if (file) {
      setSelectedFile(file);
      // Pre-load relationships details for inspector sidebar
      loadRelatedDocs(file.id);
      loadRecommendations(file.id);
    }
  }, [displayFiles, setSelectedFile, loadRelatedDocs, loadRecommendations]);

  // Build connection links trigger
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      setPendingConnection({
        sourceId: connection.source,
        targetId: connection.target
      });
    }
  }, []);

  const handleConfirmLink = async () => {
    if (pendingConnection) {
      const { sourceId, targetId } = pendingConnection;
      try {
        await addRelationship(sourceId, targetId, relationshipType);
        // Reload relationships lists
        await loadRelationships();
        if (selectedFile) {
          loadRelatedDocs(selectedFile.id);
          loadRecommendations(selectedFile.id);
        }
      } catch (e) {
        console.error(e);
        alert("Failed to save document relationship.");
      } finally {
        setPendingConnection(null);
      }
    }
  };

  // Edge selection clicking prompts deletion breaking links
  const onEdgeClick = useCallback(async (_event: React.MouseEvent, edge: Edge) => {
    _event.stopPropagation();
    if (confirm(`Do you want to break this document relationship link (${edge.label})?`)) {
      await deleteRelationship(edge.id);
      await loadRelationships();
      if (selectedFile) {
        loadRelatedDocs(selectedFile.id);
        loadRecommendations(selectedFile.id);
      }
    }
  }, [deleteRelationship, loadRelationships, selectedFile, loadRelatedDocs, loadRecommendations]);

  const sourceFile = pendingConnection ? displayFiles.find(f => f.id === pendingConnection.sourceId) : null;
  const targetFile = pendingConnection ? displayFiles.find(f => f.id === pendingConnection.targetId) : null;

  return (
    <div className="w-full h-full relative border border-white/5 bg-zinc-950/60 rounded-xl overflow-hidden shadow-inner flex flex-col min-h-0 select-none">
      
      {/* Canvas Top Stats indicator */}
      <div className="absolute top-3 left-3 z-10 p-2.5 bg-zinc-950/80 border border-zinc-800/60 rounded-lg text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-2 backdrop-blur-sm shadow-md">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        <span>Document Graph Matrix: {displayFiles.length} Nodes &bull; {relationships.length} Links</span>
      </div>

      {displayFiles.length <= 1 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 text-zinc-400">
          <Link2 className="h-10 w-10 text-indigo-400/80 animate-pulse mb-3" />
          <h3 className="text-sm font-bold text-zinc-200">Catalog Documents to Build Graph</h3>
          <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-normal">
            You need at least two files in your active workspace folder to link dependencies. Crawl your directory pathways to get started.
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full h-full min-h-0 relative bg-zinc-950/[0.15]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            className="w-full h-full"
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 [&>button]:border-zinc-800 text-zinc-400 [&>button]:bg-zinc-950 shrink-0" />
          </ReactFlow>
        </div>
      )}

      {/* Slick visual canvas overlay modal for confirming edge relationships linking */}
      {pendingConnection && sourceFile && targetFile && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Link2 size={14} /> Establish Relationship Link
              </h3>
              <button 
                onClick={() => setPendingConnection(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-zinc-900/60 rounded border border-zinc-850 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest block mb-1">Source file</span>
                  <span className="text-zinc-200 font-semibold block truncate" title={sourceFile.filename}>{sourceFile.filename}</span>
                </div>
                <div className="shrink-0 text-zinc-600 font-bold font-mono">➔</div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest block mb-1">Target file</span>
                  <span className="text-zinc-200 font-semibold block truncate" title={targetFile.filename}>{targetFile.filename}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Relationship Type</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="Supporting">Supporting Doc</option>
                  <option value="Invoice">Related Invoice</option>
                  <option value="Receipt">Payment Receipt</option>
                  <option value="Contract">Target Contract</option>
                  <option value="Statement">Bank Statement</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmLink}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-md text-xs font-bold transition-all shadow-md"
              >
                Create Link
              </button>
              <button
                onClick={() => setPendingConnection(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-md text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
