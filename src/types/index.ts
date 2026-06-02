export interface Workspace {
  id: string;
  name: string;
  description?: string;
  paths: string[];
  indexing_settings: {
    excluded_extensions: string[];
    excluded_paths: string[];
    max_file_size: number;
  };
  created_at: number;
  updated_at: number;
}

export interface FileRecord {
  id: string;
  workspace_id: string;
  filename: string;
  extension: string;
  path: string;
  size: number;
  hash: string;
  created_at: number;
  modified_at: number;
  indexed_at: number;
  category: string;
  snippet?: string;
  extracted_metadata?: string;
}

export interface DocumentEntity {
  id: string;
  file_id: string;
  key: string;
  value: string;
  confidence: number;
}

export interface DuplicateCluster {
  hash: string;
  file_count: number;
  total_wasted_size: number;
  files: FileRecord[];
}

export interface RuleConditions {
  extensions?: string[];
  filename_contains?: string;
  min_size?: number;
  max_size?: number;
  content_contains?: string;
  regex_match?: string;
}

export interface Rule {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  trigger_event: string;
  conditions: RuleConditions;
  actions: RuleAction[];
  created_at: number;
  updated_at: number;
}

export type RuleAction =
  | { type: 'Move'; payload: { destination: string } }
  | { type: 'Rename'; payload: { pattern: string } }
  | { type: 'Tag'; payload: { tag_ids: string[] } }
  | { type: 'Trash' }
  | { type: 'Categorize'; payload: { category: string } };

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface SystemHealth {
  db_size_bytes: number;
  total_files: number;
  total_rules: number;
  automation_logs: number;
  tesseract_installed: boolean;
}

export interface AutomationLog {
  id: string;
  rule_id: string;
  rule_name: string;
  file_path: string;
  action_taken: string;
  timestamp: number;
  success: boolean;
  error_msg?: string;
}

export type IndexingStatus =
  | { type: 'Idle' }
  | { type: 'Scanning'; current: number; total: number; current_file: string }
  | { type: 'Finished'; files_indexed: number }
  | { type: 'Failed'; payload: string };


export interface DocumentTimelineEvent {
  id: string;
  file_id: string;
  event_type: 'Created' | 'OcrScan' | 'WorkflowRun' | 'LinkCreated' | 'LinkDeleted';
  title: string;
  description: string | null;
  created_at: number;
}

export interface DocumentVersion {
  id: string;
  file_id: string;
  version_number: number;
  filename: string;
  comment: string | null;
  backup_path: string;
  hash: string;
  created_at: number;
}

export interface ReportingStats {
  total_files: number;
  total_size_bytes: number;
  duplicate_count: number;
  wasted_size_bytes: number;
  category_distribution: Record<string, number>;
  automation_runs_count?: number;
  automation_success_rate?: number;
  automation_failures_count?: number;
  total_vaults: number;
  vaulted_docs_count: number;
}

