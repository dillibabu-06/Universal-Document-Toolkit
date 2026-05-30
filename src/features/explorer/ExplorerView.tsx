import React from 'react';
import { Filter, Layers, Search, Check, FileText, SplitSquareHorizontal } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileRecord } from '../../types';
import PreviewEngine from './PreviewEngine';
import MetadataInspector from './MetadataInspector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

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
        
        <Button
          variant={!selectedCategory ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="h-6 text-xs px-2"
        >
          All Categories
        </Button>
        {['Invoice', 'Receipt', 'Resume', 'Tax Document', 'Bank Statement', 'Contract', 'College Notes'].map(cat => {
          const hasFiles = files.some(f => f.category === cat);
          if (!hasFiles) return null;
          return (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="h-6 text-xs px-2"
            >
              {cat}
            </Button>
          );
        })}

        <div className="w-[1px] h-4 bg-zinc-800 mx-2"></div>

        {/* Extension filters */}
        <Button
          variant={!selectedExtension ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedExtension(null)}
          className="h-6 text-xs px-2"
        >
          All Exts
        </Button>
        {availableExtensions.map(ext => (
          <Button
            key={ext}
            variant={selectedExtension === ext ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedExtension(ext)}
            className="h-6 text-xs px-2 uppercase"
          >
            .{ext}
          </Button>
        ))}

        <div className="w-[1px] h-4 bg-zinc-800 mx-2"></div>

        <Button
          variant={showDuplicates ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowDuplicates(!showDuplicates)}
          className={`h-6 text-xs px-2 flex items-center gap-1 ${showDuplicates ? 'bg-amber-500 hover:bg-amber-600 text-black border-transparent' : 'text-zinc-500 hover:text-amber-500'}`}
        >
          <Layers className="h-3 w-3" />
          Show Duplicates
          {duplicates.length > 0 && <span className="ml-1 bg-black/20 px-1 rounded-sm text-[9px]">{duplicates.length}</span>}
        </Button>
      </div>

      {/* Table Data stream or Duplicates View */}
      {!showDuplicates ? (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Main Table View */}
          <div className={`${selectedFile ? 'col-span-7' : 'col-span-12'} flex flex-col min-h-0 transition-all duration-300`}>
            <div ref={parentRef} className="matte-panel overflow-y-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center px-4">
                      <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-zinc-300">
                        {selectedRowIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                          <Check className="h-3.5 w-3.5 text-indigo-400" />
                        ) : (
                          <div className="h-3 w-3 border border-zinc-700 rounded-sm"></div>
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Workflow Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                      <td colSpan={6} aria-hidden="true" />
                    </tr>
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const file = filteredFiles[virtualRow.index];
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <TableRow 
                        key={file.id} 
                        onClick={() => setSelectedFile(file)}
                        data-state={isSelected ? "selected" : undefined}
                        className="cursor-pointer"
                        style={{ height: `${virtualRow.size}px` }}
                      >
                        <TableCell className="text-center" onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleRowSelection(file.id); }}>
                          {selectedRowIds.includes(file.id) ? (
                            <Check className="h-3.5 w-3.5 text-indigo-400 mx-auto" />
                          ) : (
                            <div className="h-3 w-3 border border-zinc-700 rounded-sm mx-auto hover:border-zinc-500"></div>
                          )}
                        </TableCell>
                        <TableCell className="flex items-center gap-2 min-w-0">
                          <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-zinc-200">{file.filename}</span>
                            <span className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5">{file.path}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getCategoryColor(file.category)}`}>
                            {file.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getStatusBadge(getWorkflowStatus(file))}>
                            {getWorkflowStatus(file)}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-400">{formatBytes(file.size)}</TableCell>
                        <TableCell className="text-zinc-400">{formatDate(file.modified_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                      <td colSpan={6} aria-hidden="true" />
                    </tr>
                  )}
                  {filteredFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState 
                          icon={<Search className="h-8 w-8" />}
                          title="No Documents Match Filter"
                          description="Try clearing active category selections or query search keywords."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Right Inspector Pane */}
          {selectedFile && (
            <div className="col-span-5 flex flex-col min-h-0 bg-black/20 rounded-xl border border-white/5 overflow-y-auto animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-dark shrink-0">
                <h2 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <SplitSquareHorizontal size={14} className="text-indigo-400" /> Inspector
                </h2>
              </div>
              <div className="flex flex-col p-4 gap-6 min-h-0 flex-1 overflow-y-auto">
                <div className="h-[250px] shrink-0">
                  <PreviewEngine file={selectedFile} />
                </div>
                <MetadataInspector file={selectedFile} formatBytes={formatBytes} formatDate={formatDate} />
              </div>
            </div>
          )}
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
            <Button 
              variant="outline"
              onClick={() => alert(`Bulk move trigger for ${selectedRowIds.length} items.`)}
            >
              Organize Locations
            </Button>
            <Button 
              variant="outline"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
              onClick={() => {
                if (confirm(`Relocate ${selectedRowIds.length} select files to Recycle Bin?`)) {
                  setSelectedRowIds([]);
                }
              }}
            >
              Recycle Selected
            </Button>
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
