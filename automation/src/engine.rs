use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use database::repo::file_repo::FileRepository;
use database::repo::rule_repo::RuleRepository;
use database::repo::tag_repo::TagRepository;
use database::DbPool;
use sdw_core::error::{AppError, Result};
use sdw_core::models::{AutomationLog, FileRecord, Rule, RuleAction, RuleConditions};

pub struct AutomationEngine {
    pool: DbPool,
}

impl AutomationEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Evaluates all active rules in a workspace for a newly discovered file and runs matches
    pub async fn handle_file_created(&self, workspace_id: &str, file: &FileRecord) -> Result<()> {
        let rules = {
            let conn = self
                .pool
                .get()
                .map_err(|e| AppError::Database(format!("Checkout failed: {}", e)))?;
            let rule_repo = RuleRepository::new(&conn);
            rule_repo.list(workspace_id)?
        };

        for rule in rules {
            if !rule.is_active || rule.trigger_event != "on_create" {
                continue;
            }

            if self.evaluate_conditions(file, &rule.conditions) {
                self.execute_rule(workspace_id, file, &rule).await?;
            }
        }

        Ok(())
    }

    /// Tests if a file meets the rule conditions
    pub fn evaluate_conditions(&self, file: &FileRecord, conditions: &RuleConditions) -> bool {
        // 1. Extension match (case-insensitive)
        if let Some(exts) = &conditions.extensions {
            if !exts.is_empty() {
                let file_ext = file.extension.to_lowercase();
                let matches_ext = exts.iter().any(|e| e.to_lowercase() == file_ext);
                if !matches_ext {
                    return false;
                }
            }
        }

        // 2. Filename search
        if let Some(substring) = &conditions.filename_contains {
            if !substring.is_empty()
                && !file
                    .filename
                    .to_lowercase()
                    .contains(&substring.to_lowercase())
            {
                return false;
            }
        }

        // 3. Min size match
        if let Some(min) = conditions.min_size {
            if file.size < min {
                return false;
            }
        }

        // 4. Max size match
        if let Some(max) = conditions.max_size {
            if file.size > max {
                return false;
            }
        }

        // 5. Regex match on filename
        if let Some(regex_pattern) = &conditions.regex_match {
            if !regex_pattern.is_empty() {
                if let Ok(re) = regex::Regex::new(regex_pattern) {
                    if !re.is_match(&file.filename) {
                        return false;
                    }
                }
            }
        }

        // 6. Content Contains (requires DB lookup)
        if let Some(content_keyword) = &conditions.content_contains {
            if !content_keyword.is_empty() {
                // Fetch document content
                let mut content_matched = false;
                if let Ok(conn) = self.pool.get() {
                    let file_repo = FileRepository::new(&conn);
                    if let Ok(Some(doc_content)) = file_repo.get_document_content(&file.id) {
                        if doc_content
                            .extracted_text
                            .to_lowercase()
                            .contains(&content_keyword.to_lowercase())
                        {
                            content_matched = true;
                        }
                    }
                }
                if !content_matched {
                    return false;
                }
            }
        }

        true
    }

    /// Execution channel executing MOVE, RENAME, or TAG operations
    pub async fn execute_rule(
        &self,
        _workspace_id: &str,
        file: &FileRecord,
        rule: &Rule,
    ) -> Result<()> {
        let conn = self
            .pool
            .get()
            .map_err(|e| AppError::Database(format!("Checkout failed: {}", e)))?;

        let rule_repo = RuleRepository::new(&conn);
        let file_repo = FileRepository::new(&conn);
        let tag_repo = TagRepository::new(&conn);

        let mut current_path = PathBuf::from(&file.path);
        let mut current_filename = file.filename.clone();

        for action in &rule.actions {
            let log_id = Uuid::new_v4().to_string();
            let timestamp = Utc::now().timestamp();

            match action {
                RuleAction::Move { destination } => {
                    let dest_dir = Path::new(destination);
                    if !dest_dir.exists() {
                        if let Err(e) = fs::create_dir_all(dest_dir) {
                            let log = AutomationLog {
                                id: log_id,
                                rule_id: rule.id.clone(),
                                rule_name: rule.name.clone(),
                                file_path: current_path.to_string_lossy().to_string(),
                                action_taken: format!("MOVE to {}", destination),
                                timestamp,
                                success: false,
                                error_msg: Some(format!("Create directory failed: {}", e)),
                            };
                            rule_repo.log_automation(&log)?;
                            continue;
                        }
                    }

                    // Compute safe path to avoid collisions
                    let mut dest_path = dest_dir.join(&current_filename);
                    let mut counter = 1;
                    let stem = Path::new(&current_filename)
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or(&current_filename);
                    let ext = Path::new(&current_filename)
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("");

                    while dest_path.exists() {
                        let new_filename = if ext.is_empty() {
                            format!("{}_{}", stem, counter)
                        } else {
                            format!("{}_{}.{}", stem, counter, ext)
                        };
                        dest_path = dest_dir.join(&new_filename);
                        counter += 1;
                    }

                    // Physical file relocation (fallback to copy + remove for cross-device)
                    if fs::rename(&current_path, &dest_path).is_err() {
                        if let Err(e) = fs::copy(&current_path, &dest_path)
                            .and_then(|_| fs::remove_file(&current_path))
                        {
                            let log = AutomationLog {
                                id: log_id,
                                rule_id: rule.id.clone(),
                                rule_name: rule.name.clone(),
                                file_path: current_path.to_string_lossy().to_string(),
                                action_taken: format!("MOVE to {}", destination),
                                timestamp,
                                success: false,
                                error_msg: Some(format!("File move operation failed: {}", e)),
                            };
                            rule_repo.log_automation(&log)?;
                            return Err(AppError::Io(format!("Move failed: {}", e)));
                        }
                    }

                    let old_path_str = current_path.to_string_lossy().to_string();
                    let new_path_str = dest_path.to_string_lossy().to_string();
                    current_path = dest_path.clone();

                    // Update SQLite database reference
                    if let Ok(Some(mut record)) = file_repo.get_by_path(&old_path_str) {
                        file_repo.delete_by_path(&old_path_str)?;
                        record.path = new_path_str.clone();
                        record.filename = dest_path
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or(&current_filename)
                            .to_string();
                        current_filename = record.filename.clone();
                        file_repo.upsert(&record)?;
                    }

                    let log = AutomationLog {
                        id: log_id,
                        rule_id: rule.id.clone(),
                        rule_name: rule.name.clone(),
                        file_path: old_path_str,
                        action_taken: format!("MOVE to {}", new_path_str),
                        timestamp,
                        success: true,
                        error_msg: None,
                    };
                    rule_repo.log_automation(&log)?;
                }

                RuleAction::Rename { pattern } => {
                    let date_str = Utc::now().format("%Y-%m-%d").to_string();
                    let stem = Path::new(&current_filename)
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or(&current_filename);

                    // Replace variables in pattern
                    let new_stem = pattern
                        .replace("{date}", &date_str)
                        .replace("{filename}", stem);

                    let ext = Path::new(&current_filename)
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("");

                    let new_filename = if ext.is_empty() {
                        new_stem.clone()
                    } else {
                        format!("{}.{}", new_stem, ext)
                    };

                    let parent_dir = current_path.parent().unwrap_or_else(|| Path::new(""));
                    let mut dest_path = parent_dir.join(&new_filename);

                    // Ensure safe overwrite boundaries
                    let mut counter = 1;
                    while dest_path.exists() && dest_path != current_path {
                        let dedup_filename = if ext.is_empty() {
                            format!("{}_{}", new_stem, counter)
                        } else {
                            format!("{}_{}.{}", new_stem, counter, ext)
                        };
                        dest_path = parent_dir.join(&dedup_filename);
                        counter += 1;
                    }

                    if dest_path != current_path {
                        if let Err(e) = fs::rename(&current_path, &dest_path) {
                            let log = AutomationLog {
                                id: log_id,
                                rule_id: rule.id.clone(),
                                rule_name: rule.name.clone(),
                                file_path: current_path.to_string_lossy().to_string(),
                                action_taken: format!("RENAME to {}", new_filename),
                                timestamp,
                                success: false,
                                error_msg: Some(format!("Rename operation failed: {}", e)),
                            };
                            rule_repo.log_automation(&log)?;
                            return Err(AppError::Io(format!("Rename failed: {}", e)));
                        }

                        let old_path_str = current_path.to_string_lossy().to_string();
                        let new_path_str = dest_path.to_string_lossy().to_string();
                        current_path = dest_path.clone();

                        if let Ok(Some(mut record)) = file_repo.get_by_path(&old_path_str) {
                            file_repo.delete_by_path(&old_path_str)?;
                            record.path = new_path_str;
                            record.filename =
                                dest_path.file_name().unwrap().to_string_lossy().to_string();
                            current_filename = record.filename.clone();
                            file_repo.upsert(&record)?;
                        }

                        let log = AutomationLog {
                            id: log_id,
                            rule_id: rule.id.clone(),
                            rule_name: rule.name.clone(),
                            file_path: old_path_str,
                            action_taken: format!("RENAME to {}", current_filename),
                            timestamp,
                            success: true,
                            error_msg: None,
                        };
                        rule_repo.log_automation(&log)?;
                    }
                }

                RuleAction::Tag { tag_ids } => {
                    let path_str = current_path.to_string_lossy().to_string();
                    if let Ok(Some(record)) = file_repo.get_by_path(&path_str) {
                        let mut success = true;
                        let mut errors = Vec::new();

                        for tag_id in tag_ids {
                            if let Err(e) = tag_repo.tag_file(&record.id, tag_id) {
                                success = false;
                                errors.push(e.to_string());
                            }
                        }

                        let log = AutomationLog {
                            id: log_id,
                            rule_id: rule.id.clone(),
                            rule_name: rule.name.clone(),
                            file_path: path_str,
                            action_taken: format!("TAG file (Tags: {:?})", tag_ids),
                            timestamp,
                            success,
                            error_msg: if success {
                                None
                            } else {
                                Some(errors.join(", "))
                            },
                        };
                        rule_repo.log_automation(&log)?;
                    }
                }

                RuleAction::Trash => {
                    let path_str = current_path.to_string_lossy().to_string();
                    let success = if let Err(e) = trash::delete(&current_path) {
                        let log = AutomationLog {
                            id: log_id.clone(),
                            rule_id: rule.id.clone(),
                            rule_name: rule.name.clone(),
                            file_path: path_str.clone(),
                            action_taken: "TRASH".to_string(),
                            timestamp,
                            success: false,
                            error_msg: Some(format!("Trash failed: {}", e)),
                        };
                        let _ = rule_repo.log_automation(&log);
                        false
                    } else {
                        if let Ok(Some(_record)) = file_repo.get_by_path(&path_str) {
                            let _ = file_repo.delete_by_path(&path_str);
                        }
                        true
                    };

                    if success {
                        let log = AutomationLog {
                            id: log_id,
                            rule_id: rule.id.clone(),
                            rule_name: rule.name.clone(),
                            file_path: path_str,
                            action_taken: "TRASH".to_string(),
                            timestamp,
                            success: true,
                            error_msg: None,
                        };
                        rule_repo.log_automation(&log)?;
                        return Ok(()); // Stop rule chain since file is trashed
                    }
                }

                RuleAction::Categorize { category } => {
                    let path_str = current_path.to_string_lossy().to_string();
                    if let Ok(Some(mut record)) = file_repo.get_by_path(&path_str) {
                        record.category = category.clone();
                        let success = match file_repo.upsert(&record) {
                            Ok(_) => true,
                            Err(e) => {
                                let log = AutomationLog {
                                    id: log_id.clone(),
                                    rule_id: rule.id.clone(),
                                    rule_name: rule.name.clone(),
                                    file_path: path_str.clone(),
                                    action_taken: format!("CATEGORIZE to {}", category),
                                    timestamp,
                                    success: false,
                                    error_msg: Some(format!("Categorize failed: {}", e)),
                                };
                                let _ = rule_repo.log_automation(&log);
                                false
                            }
                        };

                        if success {
                            let log = AutomationLog {
                                id: log_id,
                                rule_id: rule.id.clone(),
                                rule_name: rule.name.clone(),
                                file_path: path_str,
                                action_taken: format!("CATEGORIZE to {}", category),
                                timestamp,
                                success: true,
                                error_msg: None,
                            };
                            rule_repo.log_automation(&log)?;
                        }
                    }
                }
            }
        }

        Ok(())
    }
}
