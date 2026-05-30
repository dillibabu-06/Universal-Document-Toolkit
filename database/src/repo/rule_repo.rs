use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use sdw_core::error::{AppError, Result};
use sdw_core::models::{AutomationLog, Rule, RuleAction, RuleConditions};

pub struct RuleRepository<'a> {
    conn: &'a PooledConnection<SqliteConnectionManager>,
}

impl<'a> RuleRepository<'a> {
    pub fn new(conn: &'a PooledConnection<SqliteConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn create(&self, rule: &Rule) -> Result<()> {
        let conditions_json = serde_json::to_string(&rule.conditions).map_err(|e| {
            AppError::Configuration(format!("Failed to serialize rule conditions: {}", e))
        })?;
        let actions_json = serde_json::to_string(&rule.actions).map_err(|e| {
            AppError::Configuration(format!("Failed to serialize rule actions: {}", e))
        })?;

        self.conn.execute(
            "INSERT INTO rules (id, workspace_id, name, is_active, trigger_event, conditions, actions, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                rule.id,
                rule.workspace_id,
                rule.name,
                if rule.is_active { 1 } else { 0 },
                rule.trigger_event,
                conditions_json,
                actions_json,
                rule.created_at,
                rule.updated_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to insert rule: {}", e)))?;

        Ok(())
    }

    pub fn get(&self, id: &str) -> Result<Option<Rule>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, is_active, trigger_event, conditions, actions, created_at, updated_at FROM rules WHERE id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Database(format!("Failed to execute rule query: {}", e)))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Database(e.to_string()))? {
            let active_int: i32 = row.get(3).map_err(|e| AppError::Database(e.to_string()))?;
            let conditions_str: String =
                row.get(5).map_err(|e| AppError::Database(e.to_string()))?;
            let actions_str: String = row.get(6).map_err(|e| AppError::Database(e.to_string()))?;

            let conditions: RuleConditions =
                serde_json::from_str(&conditions_str).map_err(|e| {
                    AppError::Configuration(format!("Failed to deserialize conditions: {}", e))
                })?;
            let actions: Vec<RuleAction> = serde_json::from_str(&actions_str).map_err(|e| {
                AppError::Configuration(format!("Failed to deserialize actions: {}", e))
            })?;

            Ok(Some(Rule {
                id: row.get(0).map_err(|e| AppError::Database(e.to_string()))?,
                workspace_id: row.get(1).map_err(|e| AppError::Database(e.to_string()))?,
                name: row.get(2).map_err(|e| AppError::Database(e.to_string()))?,
                is_active: active_int != 0,
                trigger_event: row.get(4).map_err(|e| AppError::Database(e.to_string()))?,
                conditions,
                actions,
                created_at: row.get(7).map_err(|e| AppError::Database(e.to_string()))?,
                updated_at: row.get(8).map_err(|e| AppError::Database(e.to_string()))?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list(&self, workspace_id: &str) -> Result<Vec<Rule>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, is_active, trigger_event, conditions, actions, created_at, updated_at FROM rules WHERE workspace_id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare list rules: {}", e)))?;

        let rule_iter = stmt
            .query_map(params![workspace_id], |row| {
                let active_int: i32 = row.get(3)?;
                let conditions_str: String = row.get(5)?;
                let actions_str: String = row.get(6)?;

                let conditions: RuleConditions =
                    serde_json::from_str(&conditions_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?;
                let actions: Vec<RuleAction> = serde_json::from_str(&actions_str).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?;

                Ok(Rule {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    is_active: active_int != 0,
                    trigger_event: row.get(4)?,
                    conditions,
                    actions,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })
            .map_err(|e| AppError::Database(format!("Failed to query rules: {}", e)))?;

        let mut rules = Vec::new();
        for r in rule_iter {
            rules.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(rules)
    }

    pub fn update(&self, rule: &Rule) -> Result<()> {
        let conditions_json = serde_json::to_string(&rule.conditions).map_err(|e| {
            AppError::Configuration(format!("Failed to serialize rule conditions: {}", e))
        })?;
        let actions_json = serde_json::to_string(&rule.actions).map_err(|e| {
            AppError::Configuration(format!("Failed to serialize rule actions: {}", e))
        })?;

        self.conn.execute(
            "UPDATE rules SET name = ?1, is_active = ?2, trigger_event = ?3, conditions = ?4, actions = ?5, updated_at = ?6 WHERE id = ?7",
            params![
                rule.name,
                if rule.is_active { 1 } else { 0 },
                rule.trigger_event,
                conditions_json,
                actions_json,
                rule.updated_at,
                rule.id,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to update rule: {}", e)))?;

        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM rules WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(format!("Failed to delete rule: {}", e)))?;

        Ok(())
    }

    // Automation Logging System
    pub fn log_automation(&self, log: &AutomationLog) -> Result<()> {
        self.conn.execute(
            "INSERT INTO automation_logs (id, rule_id, rule_name, file_path, action_taken, timestamp, success, error_msg)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                log.id,
                log.rule_id,
                log.rule_name,
                log.file_path,
                log.action_taken,
                log.timestamp,
                if log.success { 1 } else { 0 },
                log.error_msg,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to save automation log: {}", e)))?;

        Ok(())
    }

    pub fn list_automation_logs(&self, limit: usize) -> Result<Vec<AutomationLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, rule_id, rule_name, file_path, action_taken, timestamp, success, error_msg
             FROM automation_logs
             ORDER BY timestamp DESC
             LIMIT ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare logs: {}", e)))?;

        let logs_iter = stmt
            .query_map(params![limit as i32], |row| {
                let success_int: i32 = row.get(6)?;
                Ok(AutomationLog {
                    id: row.get(0)?,
                    rule_id: row.get(1)?,
                    rule_name: row.get(2)?,
                    file_path: row.get(3)?,
                    action_taken: row.get(4)?,
                    timestamp: row.get(5)?,
                    success: success_int != 0,
                    error_msg: row.get(7)?,
                })
            })
            .map_err(|e| AppError::Database(format!("Querying logs failed: {}", e)))?;

        let mut logs = Vec::new();
        for l in logs_iter {
            logs.push(l.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(logs)
    }
}
