import { create } from 'zustand';
import { Workspace, FileRecord, DuplicateCluster, Tag, IndexingStatus, DocumentTimelineEvent, DocumentVersion, ReportingStats } from '../types';
import { DocumentRelationship } from '../types/relationship';

// Safe Tauri IPC wrapper supporting fallback mock modes when loaded in web browsers
export const runIPC = async <T>(cmd: string, args: Record<string, any> = {}): Promise<T> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke<T>(cmd, args);
  } else {
    // Elegant Mocks for Browser-Only and Development Preview Environments
    console.warn(`Tauri is not loaded. Mocking response for command: ${cmd}`, args);
    switch (cmd) {
      case 'list_workspaces':
        return [
          {
            id: 'ws-finance',
            name: 'Finance & Tax Invoices',
            description: 'Monitors receipts and corporate taxation PDFs',
            paths: ['/Users/dillibabu/Downloads/finance'],
            indexing_settings: { excluded_extensions: [], excluded_paths: [], max_file_size: 10000 },
            created_at: Date.now(),
            updated_at: Date.now()
          },
          {
            id: 'ws-college',
            name: 'College Assignments',
            description: 'Monitors university lectures and class syllabus docx',
            paths: ['/Users/dillibabu/Documents/college'],
            indexing_settings: { excluded_extensions: [], excluded_paths: [], max_file_size: 10000 },
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ] as any;
      case 'search_files':
      case 'list_files':
        return [
          {
            id: '1',
            workspace_id: 'ws-finance',
            filename: 'invoice_2026_q1.pdf',
            extension: 'pdf',
            path: '/Users/dillibabu/Downloads/finance/invoice_2026_q1.pdf',
            size: 125432,
            hash: 'h-1',
            created_at: Date.now() - 500000,
            modified_at: Date.now() - 500000,
            indexed_at: Date.now(),
            category: 'Invoice'
          },
          {
            id: '2',
            workspace_id: 'ws-finance',
            filename: 'resume_dillibabu_se.pdf',
            extension: 'pdf',
            path: '/Users/dillibabu/Downloads/finance/resume_dillibabu_se.pdf',
            size: 98450,
            hash: 'h-2',
            created_at: Date.now() - 1000000,
            modified_at: Date.now() - 1000000,
            indexed_at: Date.now(),
            category: 'Resume'
          },
          {
            id: '3',
            workspace_id: 'ws-finance',
            filename: 'receipt_uber_delhi.jpg',
            extension: 'jpg',
            path: '/Users/dillibabu/Downloads/finance/receipt_uber_delhi.jpg',
            size: 512000,
            hash: 'h-3',
            created_at: Date.now() - 200000,
            modified_at: Date.now() - 200000,
            indexed_at: Date.now(),
            category: 'Receipt'
          }
        ] as any;
      case 'list_duplicates':
        return [
          {
            hash: 'duplicate-hash-1',
            file_count: 2,
            total_wasted_size: 125432,
            files: [
              {
                id: 'dup-1',
                workspace_id: 'ws-finance',
                filename: 'invoice_2026_q1.pdf',
                extension: 'pdf',
                path: '/Users/dillibabu/Downloads/finance/invoice_2026_q1.pdf',
                size: 125432,
                hash: 'duplicate-hash-1',
                created_at: Date.now(),
                modified_at: Date.now(),
                indexed_at: Date.now(),
                category: 'Invoice'
              },
              {
                id: 'dup-2',
                workspace_id: 'ws-finance',
                filename: 'invoice_2026_q1_copy.pdf',
                extension: 'pdf',
                path: '/Users/dillibabu/Downloads/finance/copies/invoice_2026_q1_copy.pdf',
                size: 125432,
                hash: 'duplicate-hash-1',
                created_at: Date.now(),
                modified_at: Date.now(),
                indexed_at: Date.now(),
                category: 'Invoice'
              }
            ]
          }
        ] as any;

      case 'add_relationship':
        return {} as any;
      case 'delete_relationship':
        return {} as any;
      case 'select_folder':
        return '/Users/dillibabu/Downloads/finance' as any;
      case 'trash_file':
        console.warn('Mock: trash_file - would move to trash:', args);
        return undefined as any;
      case 'open_file_location':
        console.warn('Mock: open_file_location - would reveal in Finder:', args);
        return undefined as any;
      case 'get_workspace_stats':
        return {
          total_files: 3,
          total_size: 735882,
          duplicate_clusters: 1,
          wasted_size: 125432,
          by_category: { Invoice: 1, Resume: 1, Receipt: 1 }
        } as any;
      case 'get_document_timeline':
        return [
          {
            id: 'evt-1',
            file_id: args.fileId || '1',
            event_type: 'Created',
            title: 'Document Discovered',
            description: 'File discovered and registered in workspace.',
            created_at: Math.floor(Date.now() / 1000) - 3600 * 24 * 3
          },

          {
            id: 'evt-4',
            file_id: args.fileId || '1',
            event_type: 'LinkCreated',
            title: 'Linked Document',
            description: 'Created relationship of type \'paid_by\' with target receipt_uber_delhi.jpg.',
            created_at: Math.floor(Date.now() / 1000) - 3600 * 2
          }
        ] as any;
      case 'list_document_versions':
        return [
          {
            id: 'ver-2',
            file_id: args.fileId,
            version_number: 2,
            filename: 'invoice_2026_q1.pdf',
            comment: 'Added secondary header entity',
            backup_path: '/mock/versions/2.pdf',
            hash: 'hash-v2',
            created_at: Math.floor(Date.now() / 1000) - 3600 * 2
          },
          {
            id: 'ver-1',
            file_id: args.fileId,
            version_number: 1,
            filename: 'invoice_2026_q1.pdf',
            comment: 'Base upload checkpoint',
            backup_path: '/mock/versions/1.pdf',
            hash: 'hash-v1',
            created_at: Math.floor(Date.now() / 1000) - 3600 * 24
          }
        ] as any;
      case 'create_document_version':
        return {
          id: Math.random().toString(),
          file_id: args.fileId,
          version_number: 3,
          filename: 'invoice_2026_q1.pdf',
          comment: args.comment || 'Manual version checkpoint',
          backup_path: '/mock/versions/3.pdf',
          hash: 'hash-v3',
          created_at: Math.floor(Date.now() / 1000)
        } as any;
      case 'restore_document_version':
        return {} as any;
      case 'get_reporting_stats':
        return {
          total_files: 1245,
          total_size_bytes: 450000000,
          duplicate_count: 34,
          wasted_size_bytes: 12000000,
          category_distribution: { Invoice: 450, Receipt: 320, Contract: 120, 'Tax Document': 50, Other: 305 },
          total_vaults: 2,
          vaulted_docs_count: 45
        } as any;
      default:
        return {} as T;
    }
  }
};

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  files: FileRecord[];
  searchResults: FileRecord[]; // FTS5 search-specific results for command palette
  duplicates: DuplicateCluster[];
  tags: Tag[];
  relationships: DocumentRelationship[];
  relatedDocs: Array<[DocumentRelationship, FileRecord]>;
  recommendations: FileRecord[];
  indexingStatus: IndexingStatus;
  activeView: 'dashboard' | 'explorer' | 'pdf' | 'office' | 'media' | 'settings' | 'vault' | 'timeline' | 'reporting';
  searchQuery: string; // Tracks last search query for command palette

  // Navigation & Base Actions
  setActiveView: (view: 'dashboard' | 'explorer' | 'pdf' | 'office' | 'media' | 'settings' | 'vault' | 'timeline' | 'reporting') => void;
  setActiveWorkspace: (id: string | null) => void;
  init: () => Promise<void>;
  
  // Workspace Actions
  createWorkspace: (name: string, paths: string[], description?: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Scanning & Indexing
  startIndexing: () => Promise<void>;
  setIndexingStatus: (status: IndexingStatus) => void;
  
  // File search
  searchFiles: (query: string, append?: boolean, offset?: number) => Promise<void>;
  
  // File operations
  trashFile: (path: string) => Promise<boolean>;
  openFileLocation: (path: string) => Promise<void>;
  
  // Tags Actions
  createTag: (name: string, color: string) => Promise<void>;

  // Folder Selector
  selectFolder: () => Promise<string | null>;

  // Relationships Actions
  loadRelationships: () => Promise<void>;
  loadRelatedDocs: (fileId: string) => Promise<void>;
  loadRecommendations: (fileId: string) => Promise<void>;
  addRelationship: (sourceId: string, targetId: string, relType: string) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;

  // Timeline Actions
  selectedFileTimeline: DocumentTimelineEvent[];
  loadDocumentTimeline: (fileId: string) => Promise<void>;

  // Versioning Actions
  selectedFileVersions: DocumentVersion[];
  loadDocumentVersions: (fileId: string) => Promise<void>;
  createDocumentVersion: (fileId: string, comment?: string) => Promise<void>;
  restoreDocumentVersion: (versionId: string) => Promise<void>;

  // Reporting Actions
  reportingStats: ReportingStats | null;
  loadReportingStats: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  files: [],
  searchResults: [],
  duplicates: [],
  tags: [],
  relationships: [],
  relatedDocs: [],
  recommendations: [],
  selectedFileTimeline: [],
  selectedFileVersions: [],
  indexingStatus: { type: 'Idle' },
  activeView: 'dashboard',
  searchQuery: '',
  reportingStats: null,

  setActiveView: (activeView) => set({ activeView }),
  
  setActiveWorkspace: (id) => {
    set({ 
      activeWorkspaceId: id, 
      indexingStatus: { type: 'Idle' }
    });
    if (id) {
      get().searchFiles('', false, 0);
      runIPC<DuplicateCluster[]>('list_duplicates', { workspaceId: id }).then(dups => set({ duplicates: dups }));
      get().loadRelationships();
    } else {
      set({ 
        files: [], 
        duplicates: [], 
        relationships: [], 
        relatedDocs: [], 
        recommendations: []
      });
    }
  },

  init: async () => {
    try {
      const workspaces = await runIPC<Workspace[]>('list_workspaces');
      const tags = await runIPC<Tag[]>('list_tags');
      set({ workspaces, tags });
      if (workspaces.length > 0 && !get().activeWorkspaceId) {
        get().setActiveWorkspace(workspaces[0].id);
      }
    } catch (e) {
      console.error("Init store failed", e);
    }
  },

  createWorkspace: async (name, paths, description) => {
    try {
      const workspace = await runIPC<Workspace>('create_workspace', { name, paths, description });
      set(state => ({ workspaces: [...state.workspaces, workspace] }));
      get().setActiveWorkspace(workspace.id);
    } catch (e) {
      console.error("Create workspace failed", e);
    }
  },

  deleteWorkspace: async (id) => {
    try {
      await runIPC('delete_workspace', { id });
      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId
      }));
      const remaining = get().workspaces;
      if (remaining.length > 0) {
        get().setActiveWorkspace(remaining[0].id);
      }
    } catch (e) {
      console.error("Delete workspace failed", e);
    }
  },

  startIndexing: async () => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;

    set({ indexingStatus: { type: 'Scanning', current: 0, total: 0, current_file: 'Initializing scanner...' } });

    try {
      await runIPC('trigger_indexing', { workspaceId: activeId });
      
      // Setup dynamic progress event listener if running under Tauri runtime
      if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<any>('indexing-progress', (event) => {
          const status = event.payload;
          set({ indexingStatus: status });

          // Refresh documents and duplicates lists when scan completes
          if (status.type === 'Finished') {
            get().searchFiles('', false, 0);
            runIPC<DuplicateCluster[]>('list_duplicates', { workspaceId: activeId }).then(dups => set({ duplicates: dups }));
            unlisten();
          }
        });
      } else {
        // Fallback fake indexing ticker for browser testing
        setTimeout(() => {
          set({ indexingStatus: { type: 'Scanning', current: 5, total: 10, current_file: 'Extracting invoices...' } });
        }, 1500);
        setTimeout(() => {
          set({ indexingStatus: { type: 'Finished', files_indexed: 10 } });
          get().searchFiles('', false, 0);
        }, 3000);
      }
    } catch (e) {
      set({ indexingStatus: { type: 'Failed', payload: String(e) } });
    }
  },

  setIndexingStatus: (indexingStatus) => set({ indexingStatus }),

  searchFiles: async (query, append = false, offset = 0) => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;
    try {
      const limit = 100;
      const files = await runIPC<FileRecord[]>('search_files', { workspaceId: activeId, query, limit, offset });
      
      set(state => {
        const newFiles = append ? [...state.files, ...files] : files;
        if (query.trim().length > 0) {
          return { files: newFiles, searchResults: newFiles, searchQuery: query };
        } else {
          return { files: newFiles, searchResults: [], searchQuery: '' };
        }
      });
    } catch (e) {
      console.error("Search files failed", e);
    }
  },

  trashFile: async (path) => {
    try {
      await runIPC('trash_file', { path });
      // Remove from duplicates store after successful trash
      set(state => ({
        duplicates: state.duplicates.map(cluster => ({
          ...cluster,
          files: cluster.files.filter(f => f.path !== path)
        })).filter(cluster => cluster.files.length > 1)
      }));
      // Refresh file list
      get().searchFiles(get().searchQuery, false, 0);
      return true;
    } catch (e) {
      console.error("Trash file failed", e);
      return false;
    }
  },

  openFileLocation: async (path) => {
    try {
      await runIPC('open_file_location', { path });
    } catch (e) {
      console.error("Open file location failed", e);
    }
  },



  createTag: async (name, color) => {
    try {
      const tag = await runIPC<Tag>('create_tag', { name, color });
      set(state => ({ tags: [...state.tags, tag] }));
    } catch (e) {
      console.error("Create tag failed", e);
    }
  },

  selectFolder: async () => {
    try {
      const selected = await runIPC<string | null>('select_folder');
      return selected;
    } catch (e) {
      console.error("Select folder failed", e);
      return null;
    }
  },



  loadRelationships: async () => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;
    try {
      const rels = await runIPC<DocumentRelationship[]>('list_relationships', { workspaceId: activeId });
      set({ relationships: rels });
    } catch (e) {
      console.error("Load relationships failed", e);
    }
  },

  loadRelatedDocs: async (fileId) => {
    try {
      const related = await runIPC<Array<[DocumentRelationship, FileRecord]>>('get_related_documents', { fileId });
      set({ relatedDocs: related });
    } catch (e) {
      console.error("Load related docs failed", e);
    }
  },

  loadRecommendations: async (fileId) => {
    try {
      const recs = await runIPC<FileRecord[]>('get_recommendations', { fileId });
      set({ recommendations: recs });
    } catch (e) {
      console.error("Load recommendations failed", e);
    }
  },

  addRelationship: async (sourceId, targetId, relType) => {
    try {
      await runIPC('add_relationship', { 
        sourceFileId: sourceId, 
        targetFileId: targetId, 
        relationshipType: relType 
      });
      await get().loadRelationships();
    } catch (e) {
      console.error("Add relationship failed", e);
      throw e;
    }
  },

  deleteRelationship: async (id) => {
    try {
      await runIPC('delete_relationship', { id });
      await get().loadRelationships();
    } catch (e) {
      console.error("Delete relationship failed", e);
    }
  },



  loadDocumentTimeline: async (fileId) => {
    try {
      const res = await runIPC<DocumentTimelineEvent[]>('get_document_timeline', { fileId });
      set({ selectedFileTimeline: res });
    } catch (e) {
      console.error("Load document timeline failed", e);
    }
  },

  loadDocumentVersions: async (fileId) => {
    try {
      const res = await runIPC<DocumentVersion[]>('list_document_versions', { fileId });
      set({ selectedFileVersions: res });
    } catch (e) {
      console.error("Load document versions failed", e);
    }
  },

  createDocumentVersion: async (fileId, comment) => {
    try {
      await runIPC('create_document_version', { fileId, comment });
      await get().loadDocumentVersions(fileId);
      await get().loadDocumentTimeline(fileId);
    } catch (e) {
      console.error("Create document version failed", e);
      throw e;
    }
  },

  restoreDocumentVersion: async (versionId) => {
    try {
      await runIPC('restore_document_version', { versionId });
      const versions = get().selectedFileVersions;
      const match = versions.find(v => v.id === versionId);
      if (match) {
        await get().loadDocumentVersions(match.file_id);
        await get().loadDocumentTimeline(match.file_id);
        // Refresh active workspace files list to show updated size/modified metrics
        const activeId = get().activeWorkspaceId;
        if (activeId) {
          await get().searchFiles(get().searchQuery);
        }
      }
    } catch (e) {
      console.error("Restore document version failed", e);
      throw e;
    }
  },

  loadReportingStats: async () => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;
    try {
      const stats = await runIPC<ReportingStats>('get_reporting_stats', { workspaceId: activeId });
      set({ reportingStats: stats });
    } catch (e) {
      console.error("Load reporting stats failed", e);
    }
  }
}));
