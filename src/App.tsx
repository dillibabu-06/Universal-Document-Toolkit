import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Cpu, X,
  RefreshCw, HardDrive, Keyboard,
  Eye, FolderOpen
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useWorkspaceStore } from './store/workspaceStore';
import { FileRecord } from './types';

import CommandPalette from './components/CommandPalette';
import Onboarding from './components/Onboarding';
import Sidebar from './app/Sidebar';
import DashboardView from './features/dashboard/DashboardView';
import ExplorerView from './features/explorer/ExplorerView';
import RelatedDocumentsSidebar from './features/explorer/RelatedDocumentsSidebar';
import SettingsView from './features/settings/SettingsView';
import OfficeStudioView from './features/office-studio/OfficeStudioView';
import PdfStudioView from './features/pdf-studio/PdfStudioView';
import VaultView from './features/vault/VaultView';
import ReportingCenterView from './features/reporting/ReportingCenter';
import MediaStudioView from './features/media-studio/MediaStudioView';

export default function App() {
  const {
    workspaces,
    activeWorkspaceId,
    files,
    indexingStatus,
    activeView,
    init,
    setActiveWorkspace,
    setActiveView,
    createWorkspace,
    startIndexing,
    selectFolder,
    searchFiles,
    searchQuery,
    openFileLocation
  } = useWorkspaceStore();

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => {
    return localStorage.getItem('sdw_onboarding_complete') === 'true';
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsPath, setNewWsPath] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Command Palette UI State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);


  // Selected file inspector focus (Right Context Panel)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'details' | 'relations'>('details');

  // Selected rows for bulk operations
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Toast notification system
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<any>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadataForm, setMetadataForm] = useState<any>({});

  // Universal Document Toolkit Ported Integration States
  
  // PDF tool handler moved.

  // Office tool handler moved.

  useEffect(() => {
    if (selectedFile) {
      setSelectedFileMetadata(null);
      setIsEditingMetadata(false);
      setMetadataForm({});
      
      invoke('get_document_metadata', { fileId: selectedFile.id })
        .then((res: any) => {
          if (res && res.structured_metadata) {
            try {
              const parsed = JSON.parse(res.structured_metadata);
              setSelectedFileMetadata(parsed);
              setMetadataForm(parsed.fields || {});
            } catch (e) {
              console.error("Failed to parse metadata JSON", e);
            }
          }
        })
        .catch((err: any) => console.error("Error loading document metadata", err));
    }
  }, [selectedFile]);

  const handleSaveMetadata = async () => {
    if (!selectedFile) return;
    try {
      const payload = JSON.stringify({ fields: metadataForm });
      await invoke('save_document_metadata', { fileId: selectedFile.id, metadataJson: payload });
      setSelectedFileMetadata({ fields: metadataForm });
      setIsEditingMetadata(false);
      showToast('Metadata updated successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update metadata.', 'error');
    }
  };

  useEffect(() => {
    init();
  }, []);

  // Debounce search queries to backend SQLite FTS5 search engine
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeWorkspaceId) {
        searchFiles(searchQuery);
      }
    }, 150); // 150ms debounce threshold

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeWorkspaceId]);

  // Listen to keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K triggers Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // View switchers: Alt+1, Alt+2, etc.
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveView('dashboard'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveView('explorer'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !newWsPath.trim()) return;
    await createWorkspace(newWsName, [newWsPath], newWsDesc);
    setIsWorkspaceModalOpen(false);
    setNewWsName('');
    setNewWsPath('');
    setNewWsDesc('');
  };

  // Helper formatting values
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Static mock status assigner for professional look
  const getWorkflowStatus = (file: FileRecord) => {
    if (file.filename.includes('invoice') || file.filename.includes('bill')) return 'Approved';
    if (file.filename.includes('resume') || file.filename.includes('cv')) return 'In Review';
    if (file.filename.includes('tax')) return 'Signed';
    return 'Draft';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'badge-status bg-emerald-500/5 text-emerald-400 border border-emerald-500/15';
      case 'In Review':
        return 'badge-status bg-amber-500/5 text-amber-400 border border-amber-500/15';
      case 'Signed':
        return 'badge-status bg-indigo-500/5 text-indigo-400 border border-indigo-500/15';
      default:
        return 'badge-status bg-zinc-800/40 text-zinc-400 border border-zinc-700/30';
    }
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

  if (!isOnboardingComplete) {
    return (
      <Onboarding 
        workspaces={workspaces}
        onSelectFolder={async () => {
          const selectedPath = await selectFolder();
          if (selectedPath) {
            const folderName = selectedPath.split(/[/\\]/).pop() || 'Workspace';
            await createWorkspace(`My ${folderName}`, [selectedPath], 'Created during onboarding');
          }
        }}
        onComplete={() => {
          localStorage.setItem('sdw_onboarding_complete', 'true');
          setIsOnboardingComplete(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-300 font-sans antialiased select-none matte-bg">
      
      {/* ==================== 1. LEFT SIDEBAR PANEL ==================== */}
      <Sidebar 
        setIsWorkspaceModalOpen={setIsWorkspaceModalOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
      />

      {/* ==================== 2. CENTER MAIN EXPLORER PANE ==================== */}
      <main className="flex-1 bg-panel-dark flex flex-col min-w-0">
        
        {/* ==================== PREMIUM WORKSPACE PRODUCTIVITY TOOLBAR ==================== */}
        <header className="h-14 border-b border-border-dark flex items-center justify-between px-6 shrink-0 bg-zinc-950/80 select-none">
          
          {/* Workspace Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
            <div className="h-4 w-[1px] bg-zinc-800 shrink-0"></div>
            
            <select 
              value={activeWorkspaceId || ''} 
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-zinc-200 cursor-pointer py-1 pl-0 pr-6 focus:ring-0 focus:outline-none outline-none max-w-[170px]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-zinc-900 text-zinc-300 font-semibold">{ws.name}</option>
              ))}
              {workspaces.length === 0 && <option value="" className="bg-zinc-900 text-zinc-500">No Workspace Registered</option>}
            </select>
          </div>

          {/* Dominated Primary Search input */}
          <div className="flex-1 max-w-xl mx-4 relative">
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center gap-2.5 bg-zinc-900/90 border border-border-dark rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 cursor-pointer transition-all"
            >
              <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="truncate w-full text-left text-zinc-500">Search documents or type commands...</span>
              <kbd className="kbd-badge shrink-0 opacity-70">⌘K</kbd>
            </div>
          </div>

          {/* Quick Action bar indicators */}
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 select-none shrink-0">
            {indexingStatus.type === 'Scanning' ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 rounded">
                <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                <span className="text-[10px] font-bold">Crawling ({indexingStatus.current}/{indexingStatus.total})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-zinc-400 font-semibold font-mono">Scanner Active</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              <HardDrive className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
              <span>{files.length} cataloged</span>
            </div>
            
            <button 
              onClick={startIndexing}
              disabled={indexingStatus.type === 'Scanning'}
              className="h-7 px-3 bg-zinc-900 hover:bg-zinc-850 border border-border-dark rounded text-zinc-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3 text-zinc-500" />
              <span>Crawl</span>
            </button>
            

          </div>
        </header>

        {/* View Frame */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          
          {/* ==================== VIEW 1: SUGGESTIONS INBOX ==================== */}
          {activeView === 'dashboard' && (
            <DashboardView 
              setSelectedFile={setSelectedFile}
              selectedFile={selectedFile}
              getWorkflowStatus={getWorkflowStatus}
              getStatusBadge={getStatusBadge}
              getCategoryColor={getCategoryColor}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          )}

          {/* ==================== VIEW 2: DOCUMENT EXPLORER ==================== */}
          {activeView === 'explorer' && (
            <ExplorerView 
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedExtension={selectedExtension}
              setSelectedExtension={setSelectedExtension}
              showDuplicates={showDuplicates}
              setShowDuplicates={setShowDuplicates}
              setSelectedFile={setSelectedFile}
              selectedFile={selectedFile}
              selectedRowIds={selectedRowIds}
              setSelectedRowIds={setSelectedRowIds}
              getWorkflowStatus={getWorkflowStatus}
              getStatusBadge={getStatusBadge}
              getCategoryColor={getCategoryColor}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          )}

          {/* ==================== VIEW: PDF TOOLS ==================== */}
          {activeView === 'pdf' && <PdfStudioView />}

          {/* ==================== VIEW: OFFICE WORKSPACE ==================== */}
          {activeView === 'office' && <OfficeStudioView />}
          {activeView === 'media' && <MediaStudioView />}

          {/* Security Vault View */}
          {activeView === 'vault' && <VaultView />}

          {/* ==================== VIEW: SETTINGS CENTER ==================== */}
          {activeView === 'settings' && <SettingsView />}

          {activeView === 'reporting' && <ReportingCenterView />}

        </div>
      </main>

      {/* ==================== 3. RIGHT CONTEXT PANEL ==================== */}
      {selectedFile && (
        <aside className="w-80 bg-zinc-900 border-l border-border-dark flex flex-col justify-between shrink-0 select-none">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Header close panel & tabs selectors */}
            <div className="h-14 flex items-center px-4 justify-between border-b border-border-dark shrink-0 bg-zinc-900">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setInspectorTab('preview')}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    inspectorTab === 'preview' 
                      ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Preview
                </button>
                <button 
                  onClick={() => setInspectorTab('details')}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    inspectorTab === 'details' 
                      ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Details
                </button>
                <button 
                  onClick={() => setInspectorTab('relations')}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    inspectorTab === 'relations' 
                      ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Relations
                </button>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inspector body based on active Tab */}
            <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1 bg-zinc-900">
              
              {inspectorTab === 'preview' && (
                <div className="space-y-4">
                  {selectedFile.extension === 'pdf' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
                        <span>PDF VIEW ENGINE v1.0</span>
                        <span>Page 1 of 1</span>
                      </div>
                      
                      <div className="p-4 bg-white text-zinc-800 rounded border border-border-dark shadow-sm text-[11px] leading-relaxed font-sans max-h-80 overflow-y-auto selection:bg-indigo-100">
                        <div className="border-b border-zinc-200 pb-2 mb-2">
                          <h2 className="text-xs font-bold uppercase text-zinc-900 tracking-wide">{selectedFile.filename}</h2>
                          <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>REGISTRY DATE: {formatDate(selectedFile.indexed_at)}</span>
                            <span>TAX REGISTER: #{selectedFile.hash.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                        
                        <p className="font-semibold text-zinc-900 mt-2">CORPORATE BILLING & TRANSACTION RECORD</p>
                        <p className="mt-1 text-zinc-600">This document acts as verified proof of payment for services rendered under active consulting agreements.</p>
                        
                        <div className="my-3 p-2 bg-zinc-50 rounded border border-zinc-200 font-mono text-[9px]">
                          <div className="flex justify-between font-bold text-zinc-700 border-b border-zinc-200 pb-1 mb-1">
                            <span>ITEM DESCRIPTION</span>
                            <span>TOTAL</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>1. System Architecture Engineering Scaffolding</span>
                            <span>$8,500.00</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>2. SQLite FTS5 instant keywords matching</span>
                            <span>$1,200.00</span>
                          </div>
                          <div className="flex justify-between font-bold text-zinc-950 pt-1 mt-1 border-t border-zinc-200">
                            <span>BALANCE DUE (USD)</span>
                            <span>$9,700.00</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-400 mt-4 text-center select-none border-t border-dashed border-zinc-200 pt-2 font-mono">OCR SCAN COMPLETED &bull; TAXONOMY CLASSIFIED AS: {selectedFile.category.toUpperCase()}</p>
                      </div>

                      <div className="bg-zinc-950 p-2.5 rounded border border-border-dark/60 font-mono text-[10px] space-y-1">
                        <span className="text-indigo-400 font-semibold text-[9px] uppercase tracking-wider block">Extracted OCR Metadata Snip</span>
                        <p className="text-zinc-400 leading-normal">"Consulting services billing, amount: $9,700.00, verified category: invoice, tax signature code verified offline."</p>
                      </div>
                    </div>
                  ) : selectedFile.extension === 'jpg' || selectedFile.extension === 'png' ? (
                    <div className="space-y-3">
                      <div className="h-44 bg-zinc-950 border border-border-dark/60 rounded flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        <div className="z-10 flex flex-col items-center gap-1.5 p-3">
                          <Eye className="h-6 w-6 text-indigo-400/90" />
                          <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-widest">{selectedFile.extension} Asset Canvas</span>
                          <span className="text-[9px] text-zinc-500 font-mono">1024 x 768 px &bull; Lossless compression</span>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-900 p-2 rounded border border-border-dark/40 font-mono text-[10px] text-zinc-400 leading-normal">
                        <span className="text-zinc-500 font-semibold block mb-1">IMAGE PARAMETERS</span>
                        <div>Dimension Ratio: <span className="text-zinc-200 font-semibold">4:3 Standard</span></div>
                        <div>Color Channel: <span className="text-zinc-200 font-semibold">sRGB 8-bit</span></div>
                        <div>Indexed Hash: <span className="text-zinc-300 truncate block">{selectedFile.hash}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
                        <span>MARKDOWN VIEW COMPILER</span>
                        <span>.{selectedFile.extension} format</span>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-border-dark/60 rounded font-mono text-[10px] text-zinc-400 space-y-2 leading-relaxed max-h-72 overflow-y-auto">
                        <div className="text-indigo-400 font-bold"># Document index markdown record</div>
                        <p className="text-zinc-300">File cataloged recursively inside workspace monitored pathways.</p>
                        <div>
                          <span className="text-zinc-500 block mt-1">## Structural details</span>
                          <div className="pl-2 border-l border-zinc-800">
                            Path: {selectedFile.path}<br />
                            Category: {selectedFile.category}<br />
                            Byte Weight: {selectedFile.size} bytes
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'details' && (
                <div className="space-y-4 select-none">
                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">File Name</label>
                    <p className="text-xs font-semibold text-zinc-200 break-all">{selectedFile.filename}</p>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Physical Location</label>
                    <p className="text-[10px] text-zinc-400 break-all font-mono bg-zinc-950 p-2 rounded border border-border-dark/40 leading-normal">{selectedFile.path}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Size</label>
                      <p className="text-xs font-semibold text-zinc-200">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Auto-Category</label>
                      <p className="text-xs font-semibold text-indigo-400">{selectedFile.category}</p>
                    </div>
                  </div>

                  {/* STRUCTURED METADATA AREA */}
                  <div className="border-t border-border-dark pt-3 mt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Structured Metadata</label>
                      {selectedFileMetadata && !isEditingMetadata && (
                        <button 
                          onClick={() => setIsEditingMetadata(true)}
                          className="text-[9px] text-zinc-450 hover:text-zinc-200 font-bold uppercase tracking-wider underline transition-colors"
                        >
                          Edit Fields
                        </button>
                      )}
                    </div>

                    {selectedFileMetadata ? (
                      isEditingMetadata ? (
                        <div className="space-y-2.5 bg-zinc-955/70 p-3 rounded border border-border-dark/40">
                          {Object.keys(metadataForm).length > 0 ? (
                            Object.keys(metadataForm).map(key => (
                              <div key={key} className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block capitalize">{key.replace(/_/g, ' ')}</span>
                                <input 
                                  type="text"
                                  value={metadataForm[key] || ''}
                                  onChange={e => setMetadataForm({ ...metadataForm, [key]: e.target.value })}
                                  className="w-full bg-zinc-900 border border-border-dark rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                                />
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 italic py-1 text-center">No metadata attributes matched the patterns.</p>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={handleSaveMetadata}
                              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-[10px] font-bold transition-all"
                            >
                              Save Changes
                            </button>
                            <button 
                              onClick={() => { setIsEditingMetadata(false); setMetadataForm(selectedFileMetadata.fields || {}); }}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded text-[10px] font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-950/60 p-3 rounded border border-border-dark/40 divide-y divide-border-dark/20 text-xs">
                          {Object.keys(selectedFileMetadata.fields || {}).length > 0 ? (
                            Object.entries(selectedFileMetadata.fields || {}).map(([key, val]) => (
                              <div key={key} className="py-2 flex justify-between gap-4">
                                <span className="text-zinc-500 font-mono capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-zinc-200 font-semibold break-all text-right">{val as string}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 italic py-1 text-center">No metadata attributes matched the patterns.</p>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="bg-zinc-950/40 p-3 rounded border border-dashed border-border-dark/60 text-center py-4">
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Structured metadata will populate automatically here once background OCR scanning has processed this document.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Workflow Stage</label>
                    <div className="mt-1 flex items-center gap-2">
                      <select 
                        value={getWorkflowStatus(selectedFile)}
                        onChange={() => alert("Workflow status updated in database tables!")}
                        className="bg-zinc-950 border border-border-dark text-zinc-300 rounded text-xs p-1.5 focus:ring-0 outline-none w-full cursor-pointer hover:border-zinc-700 transition-colors"
                      >
                        <option value="Draft">Draft Mode</option>
                        <option value="In Review">In Review</option>
                        <option value="Signed">Signed Contract</option>
                        <option value="Approved">Approved Asset</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">SHA-256 Checksum</label>
                    <p className="text-[9px] text-zinc-500 font-mono break-all bg-zinc-950 p-2 rounded border border-border-dark/45">{selectedFile.hash}</p>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Date Scanned</label>
                    <p className="text-[10px] text-zinc-400">Indexed on {formatDate(selectedFile.indexed_at)}</p>
                  </div>
                </div>
              )}

              {inspectorTab === 'relations' && (
                <RelatedDocumentsSidebar selectedFile={selectedFile} />
              )}

            </div>
          </div>

          <div className="p-3 border-t border-border-dark bg-zinc-950 flex gap-2 shrink-0 select-none">
            <button 
              onClick={() => openFileLocation(selectedFile.path)}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-border-dark hover:border-zinc-700 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
              Reveal in Finder
            </button>
          </div>
        </aside>
      )}

      {/* ==================== CREATE WORKSPACE DIALOG MODAL ==================== */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
          <form 
            onSubmit={handleCreateWorkspace}
            className="w-[28rem] bg-zinc-900 border border-border-dark p-5 rounded-lg shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Register Directory Workspace</h3>
              <button 
                type="button" 
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Workspace Designation</label>
                <input 
                  type="text" 
                  placeholder="e.g. Invoices & Receipts, College Assignments"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Monitored Folder Path</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. /Users/dillibabu/Downloads"
                    value={newWsPath}
                    onChange={(e) => setNewWsPath(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 font-mono outline-none focus:border-zinc-700"
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const selected = await selectFolder();
                      if (selected) {
                        setNewWsPath(selected);
                      }
                    }}
                    className="bg-zinc-800 border border-border-dark hover:border-zinc-700 text-zinc-300 hover:text-zinc-200 px-3 rounded text-xs transition-colors shrink-0 font-medium font-sans"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Details Context (Optional)</label>
                <textarea 
                  placeholder="Brief explanation of files managed inside this workspace"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 h-16"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-3 border-t border-border-dark">
              <button 
                type="button" 
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-border-dark/60 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Register Workspace
              </button>
            </div>
          </form>
        </div>
      )}



      {/* ==================== KEYBOARD SHORTCUT HELP PANEL MODAL ==================== */}
      {showShortcutHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
          <div className="w-96 bg-zinc-900 border border-border-dark p-5 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                <Keyboard className="h-4 w-4" /> Workspace Hotkeys
              </h3>
              <button onClick={() => setShowShortcutHelp(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">Global Search Input</span>
                <kbd className="kbd-badge">⌘ K</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Inbox Suggestions</span>
                <kbd className="kbd-badge">⌥ 1</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Document Explorer</span>
                <kbd className="kbd-badge">⌥ 2</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Duplicates List</span>
                <kbd className="kbd-badge">⌥ 3</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: watch Automations</span>
                <kbd className="kbd-badge">⌥ 4</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Activity Logs</span>
                <kbd className="kbd-badge">⌥ 5</kbd>
              </div>
            </div>

            <div className="pt-3 border-t border-border-dark text-right">
              <button 
                onClick={() => setShowShortcutHelp(false)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-border-dark/60 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Close cheatsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. COMMAND PALETTE ==================== */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveView={setActiveView}
        startIndexing={startIndexing}
        setIsWorkspaceModalOpen={setIsWorkspaceModalOpen}
        setSelectedFile={setSelectedFile}
        setInspectorTab={setInspectorTab}
      />

      {/* ==================== TOAST NOTIFICATION SYSTEM ==================== */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl text-xs font-semibold transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-zinc-900 border-emerald-500/30 text-emerald-400' 
              : toast.type === 'error'
              ? 'bg-zinc-900 border-red-500/30 text-red-400'
              : 'bg-zinc-900 border-indigo-500/30 text-indigo-400'
          }`}
        >
          {toast.type === 'success' && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircleIcon className="h-3.5 w-3.5 text-red-500" />}
          {toast.type === 'info' && <RefreshCwIcon className="h-3.5 w-3.5 text-indigo-500" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-500 hover:text-zinc-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
