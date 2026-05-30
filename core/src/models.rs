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
