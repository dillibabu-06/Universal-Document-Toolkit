import React from 'react';
import { Filter, Layers, Search, Check, FileText } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileRecord } from '../../types';

interface ExplorerViewProps {
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedExtension: string | null;
  setSelectedExtension: (ext: string | null) => void;
  showDuplicates: boolean;
  setShowDuplicates: (val: boolean) => void;
  setSelectedFile: (file: FileRecord | null) => void;
  selectedFile: FileRecord | null;
  selectedRowIds: string[];
  setSelectedRowIds: React.Dispatch<React.SetStateAction<string[]>>;
  getWorkflowStatus: (file: FileRecord) => string;
  getStatusBadge: (status: string) => string;
  getCategoryColor: (cat: string) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

export default function ExplorerView({
  selectedCategory,
  setSelectedCategory,
  selectedExtension,
  setSelectedExtension,
  showDuplicates,
  setShowDuplicates,
  setSelectedFile,
  selectedFile,
  selectedRowIds,
  setSelectedRowIds,
  getWorkflowStatus,
  getStatusBadge,
  getCategoryColor,
  formatBytes,
  formatDate
}: ExplorerViewProps) {
  const {
    files,
    duplicates,
    trashFile
  } = useWorkspaceStore();

  const parentRef = React.useRef<HTMLDivElement>(null);

  const availableExtensions = Array.from(new Set(files.map(f => f.extension))).filter(Boolean);

  const filteredFiles = files.filter(f => {
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    const matchesExtension = selectedExtension ? f.extension === selectedExtension : true;
    return matchesCategory && matchesExtension;
  });

  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredFiles.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredFiles.map(f => f.id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Category pills filtering */}
      <div className="flex flex-wrap gap-1.5 select-none items-center">
        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-2">
          <Filter className="h-3 w-3" /> Filters
        </div>
        
        <button 
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-0.5 text-xs rounded border transition-all ${!selectedCategory ? 'bg-zinc-800 text-zinc-200 border-zinc-700/60 font-semibold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          All Categories
        </button>
        {['Invoice', 'Receipt', 'Resume', 'Tax Document', 'Bank Statement', 'Contract', 'College Notes'].map(cat => {
          const hasFiles = files.some(f => f.category === cat);
          if (!hasFiles) return null;
          return (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-xs rounded border transition-all ${selectedCategory === cat ? 'bg-zinc-800 text-zinc-200 border-zinc-700/60 font-semibold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
              {cat}
            </button>
          );
        })}

        <div className="w-[1px] h-4 bg-zinc-800 mx-2"></div>

        {/* Extension filters */}
        <button 
          onClick={() => setSelectedExtension(null)}
          className={`px-2 py-0.5 text-xs rounded border transition-all ${!selectedExtension ? 'bg-zinc-800 text-zinc-200 border-zinc-700/60 font-semibold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          All Exts
        </button>
        {availableExtensions.map(ext => (
          <button 
            key={ext}
            onClick={() => setSelectedExtension(ext)}
            className={`px-2 py-0.5 text-xs rounded border uppercase transition-all ${selectedExtension === ext ? 'bg-zinc-800 text-zinc-200 border-zinc-700/60 font-semibold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            .{ext}
          </button>
        ))}

        <div className="w-[1px] h-4 bg-zinc-800 mx-2"></div>

        <button 
          onClick={() => setShowDuplicates(!showDuplicates)}
          className={`px-2 py-0.5 text-xs rounded border transition-all flex items-center gap-1 ${showDuplicates ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold' : 'text-zinc-500 border-transparent hover:text-amber-500/70'}`}
        >
          <Layers className="h-3 w-3" />
          Show Duplicates
          {duplicates.length > 0 && <span className="ml-1 bg-amber-500/20 px-1 rounded-sm text-[9px]">{duplicates.length}</span>}
        </button>
      </div>

      {/* Table Data stream or Duplicates View */}
      {!showDuplicates ? (
        <div ref={parentRef} className="matte-panel overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="w-full text-left text-xs border-collapse table-dense">
            <thead className="sticky top-0 z-10 bg-zinc-900 shadow-sm border-b border-border-dark text-explorer-header">
              <tr>
                <th className="px-4 py-2.5 w-6 text-center">
                  <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-zinc-300">
                    {selectedRowIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                      <Check className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <div className="h-3 w-3 border border-zinc-700 rounded-sm"></div>
                    )}
                  </button>
                </th>
                <th className="px-4 py-2.5">Document Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Workflow Status</th>
                <th className="px-4 py-2.5">Size</th>
                <th className="px-4 py-2.5">Modified Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/20">
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                  <td colSpan={6} aria-hidden="true" />
                </tr>
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const file = filteredFiles[virtualRow.index];
                const isSelected = selectedFile?.id === file.id;
                return (
                  <tr 
                    key={file.id} 
                    onClick={() => setSelectedFile(file)}
                    className={`hover-row cursor-pointer transition-colors border-b border-border-dark/20 ${isSelected ? 'selected-row' : ''}`}
                    style={{ height: `${virtualRow.size}px` }}
                  >
                    <td className="px-4 py-2.5 text-center" onClick={(e) => { e.stopPropagation(); toggleRowSelection(file.id); }}>
                      {selectedRowIds.includes(file.id) ? (
                        <Check className="h-3.5 w-3.5 text-indigo-400" />
                      ) : (
                        <div className="h-3 w-3 border border-zinc-800 rounded-sm group-hover:border-zinc-600"></div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-explorer-row flex items-center gap-2 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-zinc-200">{file.filename}</span>
                        <span className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5">{file.path}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getCategoryColor(file.category)}`}>
                        {file.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={getStatusBadge(getWorkflowStatus(file))}>
                        {getWorkflowStatus(file)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 font-medium">{formatBytes(file.size)}</td>
                    <td className="px-4 py-2.5 text-zinc-400 font-medium">{formatDate(file.modified_at)}</td>
                  </tr>
                );
              })}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                  <td colSpan={6} aria-hidden="true" />
                </tr>
              )}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500 text-xs">
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <Search className="h-8 w-8 text-zinc-700 mb-1" />
                      <span className="font-semibold text-zinc-400">No Documents Match Filter Criteria</span>
                      <span className="text-[11px] text-zinc-500">Try clearing active category selections or query search keywords.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="matte-panel overflow-y-auto space-y-4 p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {duplicates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No duplicates found in this workspace.</div>
          ) : (
            duplicates.map((cluster) => (
              <div key={cluster.hash} className="bg-zinc-900 border border-border-dark rounded overflow-hidden">
                <div className="px-3 py-2 bg-zinc-800/50 border-b border-border-dark flex items-center justify-between text-xs">
                  <span className="text-amber-500 font-bold">{cluster.file_count} Identical Copies</span>
                  <span className="text-zinc-500 font-mono text-[10px]">Wasted: {formatBytes(cluster.total_wasted_size)}</span>
                </div>
                <div className="divide-y divide-border-dark/30">
                  {cluster.files.map(file => (
                    <div key={file.id} className="p-2 flex items-center justify-between hover:bg-zinc-800/50">
                      <div className="min-w-0">
                        <span className="text-xs text-zinc-200 block truncate">{file.filename}</span>
                        <span className="text-[10px] text-zinc-500 block truncate font-mono">{file.path}</span>
                      </div>
                      <button onClick={() => trashFile(file.path)} className="text-zinc-500 hover:text-red-400 p-1">
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bulk actions footer */}
      {selectedRowIds.length > 0 && (
        <div className="p-3 bg-zinc-900 border border-border-dark rounded-md flex items-center justify-between px-4 select-none">
          <span className="text-xs font-semibold text-zinc-400">{selectedRowIds.length} files selected for bulk review</span>
          <div className="flex gap-2">
            <button 
              onClick={() => alert(`Bulk move trigger for ${selectedRowIds.length} items.`)}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-border-dark/80 rounded text-xs font-semibold"
            >
              Organize Locations
            </button>
            <button 
              onClick={() => {
                if (confirm(`Relocate ${selectedRowIds.length} select files to Recycle Bin?`)) {
                  setSelectedRowIds([]);
                }
              }}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-border-dark/80 rounded text-xs font-semibold"
            >
              Recycle Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
