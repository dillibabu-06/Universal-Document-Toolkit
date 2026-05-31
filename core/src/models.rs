use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub paths: Vec<String>, // Monitored root paths
    pub indexing_settings: IndexingSettings,
    pub created_at: i64,
    pub updated_at: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IndexingSettings {
    pub excluded_extensions: Vec<String>,
    pub excluded_paths: Vec<String>,
    pub max_file_size: u64, // In bytes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileRecord {
    pub id: String,
    pub workspace_id: String,
    pub filename: String,
    pub extension: String,
    pub path: String,
    pub size: u64,
    pub hash: String,
    pub created_at: i64,
    pub modified_at: i64,
    pub indexed_at: i64,
    pub category: String, // e.g., "Invoice", "Receipt", "Resume", "College Note", "Contract", "Other"
    pub snippet: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentEntity {
    pub id: String,
    pub file_id: String,
    pub key: String,
    pub value: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String, // Hex code or tailwind color name
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentContent {
    pub file_id: String,
    pub extracted_text: String,
    pub extraction_status: String,
    pub extraction_confidence: f32,
    pub extracted_at: i64,
    pub structured_metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vault {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub salt: String, // Stored as hex string
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultDocument {
    pub id: String,
    pub vault_id: String,
    pub original_filename: String,
    pub original_path: String,
    pub encrypted_path: String,
    pub added_at: i64,
}

// -----------------------------------------------------------------------------
// Visual Workflow Studio Models
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub workflow_id: String,
    pub node_type: String, // e.g., "trigger_folder", "action_ocr", "action_move"
    pub position_x: f64,
    pub position_y: f64,
    pub config: serde_json::Value, // Node specific configuration like { "folder": "/path/to/watch" }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    pub id: String,
    pub workflow_id: String,
    pub source_node: String,
    pub target_node: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub is_active: bool,
    pub trigger_event: String, // "on_create", "on_modify", "on_schedule"
    pub conditions: RuleConditions,
    pub actions: Vec<RuleAction>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleConditions {
    pub extensions: Option<Vec<String>>,
    pub filename_contains: Option<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub content_contains: Option<String>,
    pub regex_match: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RuleAction {
    Move { destination: String },
    Rename { pattern: String }, // e.g. "invoice_{date}_{filename}"
    Tag { tag_ids: Vec<String> },
    Trash,
    Categorize { category: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateCluster {
    pub hash: String,
    pub file_count: u32,
    pub total_wasted_size: u64,
    pub files: Vec<FileRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexingStatus {
    Idle,
    Scanning {
        current: usize,
        total: usize,
        current_file: String,
    },
    Finished {
        files_indexed: usize,
    },
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationLog {
    pub id: String,
    pub rule_id: String,
    pub rule_name: String,
    pub file_path: String,
    pub action_taken: String,
    pub timestamp: i64,
    pub success: bool,
    pub error_msg: Option<String>,
}
