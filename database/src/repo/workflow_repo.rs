use rusqlite::{params, Connection, Result, OptionalExtension};
use sdw_core::models::{Workflow, WorkflowNode, WorkflowEdge};

pub struct WorkflowRepository<'a> {
    conn: &'a Connection,
}

impl<'a> WorkflowRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn save_workflow(&self, workflow: &Workflow, nodes: &[WorkflowNode], edges: &[WorkflowEdge]) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        // Delete existing graph
        tx.execute("DELETE FROM workflows WHERE id = ?1", params![workflow.id])?;
        tx.execute("DELETE FROM workflow_nodes WHERE workflow_id = ?1", params![workflow.id])?;
        tx.execute("DELETE FROM workflow_edges WHERE workflow_id = ?1", params![workflow.id])?;

        // Insert workflow
        tx.execute(
            "INSERT INTO workflows (id, workspace_id, name, enabled, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![workflow.id, workflow.workspace_id, workflow.name, workflow.enabled, workflow.created_at, workflow.updated_at],
        )?;

        // Insert nodes
        let mut node_stmt = tx.prepare(
            "INSERT INTO workflow_nodes (id, workflow_id, node_type, position_x, position_y, config) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        )?;
        for node in nodes {
            let config_json = serde_json::to_string(&node.config).unwrap_or_else(|_| "{}".to_string());
            node_stmt.execute(params![node.id, node.workflow_id, node.node_type, node.position_x, node.position_y, config_json])?;
        }
        drop(node_stmt);

        // Insert edges
        let mut edge_stmt = tx.prepare(
            "INSERT INTO workflow_edges (id, workflow_id, source_node, target_node) VALUES (?1, ?2, ?3, ?4)"
        )?;
        for edge in edges {
            edge_stmt.execute(params![edge.id, edge.workflow_id, edge.source_node, edge.target_node])?;
        }
        drop(edge_stmt);

        tx.commit()?;
        Ok(())
    }

    pub fn list_workflows(&self, workspace_id: &str) -> Result<Vec<Workflow>> {
        let mut stmt = self.conn.prepare("SELECT id, workspace_id, name, enabled, created_at, updated_at FROM workflows WHERE workspace_id = ?1 ORDER BY created_at DESC")?;
        let workflows = stmt.query_map(params![workspace_id], |row| {
            Ok(Workflow {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                enabled: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        let mut res = Vec::new();
        for w in workflows {
            res.push(w?);
        }
        Ok(res)
    }

    #[allow(clippy::type_complexity)]
    pub fn get_workflow(&self, workflow_id: &str) -> Result<Option<(Workflow, Vec<WorkflowNode>, Vec<WorkflowEdge>)>> {
        let mut stmt = self.conn.prepare("SELECT id, workspace_id, name, enabled, created_at, updated_at FROM workflows WHERE id = ?1")?;
        let workflow_opt = stmt.query_row(params![workflow_id], |row| {
            Ok(Workflow {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                enabled: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        }).optional()?;

        if let Some(workflow) = workflow_opt {
            let mut node_stmt = self.conn.prepare("SELECT id, workflow_id, node_type, position_x, position_y, config FROM workflow_nodes WHERE workflow_id = ?1")?;
            let nodes_iter = node_stmt.query_map(params![workflow_id], |row| {
                let config_str: String = row.get(5)?;
                Ok(WorkflowNode {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    node_type: row.get(2)?,
                    position_x: row.get(3)?,
                    position_y: row.get(4)?,
                    config: serde_json::from_str(&config_str).unwrap_or(serde_json::Value::Null),
                })
            })?;
            let mut nodes = Vec::new();
            for n in nodes_iter {
                nodes.push(n?);
            }

            let mut edge_stmt = self.conn.prepare("SELECT id, workflow_id, source_node, target_node FROM workflow_edges WHERE workflow_id = ?1")?;
            let edges_iter = edge_stmt.query_map(params![workflow_id], |row| {
                Ok(WorkflowEdge {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    source_node: row.get(2)?,
                    target_node: row.get(3)?,
                })
            })?;
            let mut edges = Vec::new();
            for e in edges_iter {
                edges.push(e?);
            }

            Ok(Some((workflow, nodes, edges)))
        } else {
            Ok(None)
        }
    }

    pub fn delete_workflow(&self, workflow_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM workflows WHERE id = ?1", params![workflow_id])?;
        Ok(())
    }
}
