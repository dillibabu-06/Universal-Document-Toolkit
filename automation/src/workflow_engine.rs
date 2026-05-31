use sdw_core::models::{Workflow, WorkflowNode, WorkflowEdge};
use sdw_core::error::{AppError, Result};
use std::collections::{HashMap, VecDeque};
use database::DbPool;

pub struct WorkflowEngine {
    _db: DbPool,
}

impl WorkflowEngine {
    pub fn new(db: DbPool) -> Self {
        Self { _db: db }
    }

    /// Execute a workflow triggered by a specific file
    pub async fn execute_workflow(&self, workflow: &Workflow, nodes: &[WorkflowNode], edges: &[WorkflowEdge], initial_file_id: &str) -> Result<()> {
        if !workflow.enabled {
            return Ok(());
        }

        // 1. Build adjacency list for topological sort
        let mut adj: HashMap<String, Vec<String>> = HashMap::new();
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        let mut node_map: HashMap<String, &WorkflowNode> = HashMap::new();

        for node in nodes {
            adj.insert(node.id.clone(), Vec::new());
            in_degree.insert(node.id.clone(), 0);
            node_map.insert(node.id.clone(), node);
        }

        for edge in edges {
            if let Some(neighbors) = adj.get_mut(&edge.source_node) {
                neighbors.push(edge.target_node.clone());
            }
            *in_degree.entry(edge.target_node.clone()).or_insert(0) += 1;
        }

        // 2. Kahn's Algorithm for Topological Sort
        let mut queue = VecDeque::new();
        for (id, &deg) in &in_degree {
            if deg == 0 {
                queue.push_back(id.clone());
            }
        }

        let mut execution_order = Vec::new();
        while let Some(current) = queue.pop_front() {
            execution_order.push(current.clone());
            if let Some(neighbors) = adj.get(&current) {
                for next in neighbors {
                    if let Some(deg) = in_degree.get_mut(next) {
                        *deg -= 1;
                        if *deg == 0 {
                            queue.push_back(next.clone());
                        }
                    }
                }
            }
        }

        if execution_order.len() != nodes.len() {
            return Err(AppError::Automation("Workflow contains a cycle, cannot execute safely.".to_string()));
        }

        // 3. Execution State
        // Store output of nodes. For our simple cases, usually passing `file_id` along.
        let mut state: HashMap<String, serde_json::Value> = HashMap::new();
        state.insert("trigger".to_string(), serde_json::json!({ "file_id": initial_file_id }));

        // 4. Execute nodes in order
        for node_id in execution_order {
            let node = node_map.get(&node_id).unwrap();
            
            // For now, simple match on node_type
            match node.node_type.as_str() {
                "trigger_new_file" => {
                    // Start node, just sets context
                    state.insert(node_id.clone(), serde_json::json!({ "file_id": initial_file_id }));
                }
                "action_ocr" => {
                    // Simulate OCR (or run actual OCR)
                    // We need a file_id from predecessors
                    let file_id = self.find_file_id_from_predecessors(&node_id, edges, &state).unwrap_or_else(|| initial_file_id.to_string());
                    
                    tracing::info!("Executing OCR for file: {}", file_id);
                    state.insert(node_id.clone(), serde_json::json!({ "file_id": file_id, "ocr_completed": true }));
                }
                "action_extract_vendor" => {
                    let file_id = self.find_file_id_from_predecessors(&node_id, edges, &state).unwrap_or_else(|| initial_file_id.to_string());
                    tracing::info!("Extracting vendor for file: {}", file_id);
                    state.insert(node_id.clone(), serde_json::json!({ "file_id": file_id, "vendor": "ACME Corp" }));
                }
                "action_rename" => {
                    let file_id = self.find_file_id_from_predecessors(&node_id, edges, &state).unwrap_or_else(|| initial_file_id.to_string());
                    // let rename_pattern = node.config.get("pattern").and_then(|v| v.as_str()).unwrap_or("");
                    tracing::info!("Renaming file: {}", file_id);
                    state.insert(node_id.clone(), serde_json::json!({ "file_id": file_id, "renamed": true }));
                }
                "action_move" => {
                    let file_id = self.find_file_id_from_predecessors(&node_id, edges, &state).unwrap_or_else(|| initial_file_id.to_string());
                    // let destination = node.config.get("destination").and_then(|v| v.as_str()).unwrap_or("");
                    tracing::info!("Moving file: {}", file_id);
                    state.insert(node_id.clone(), serde_json::json!({ "file_id": file_id, "moved": true }));
                }
                _ => {
                    tracing::warn!("Unknown node type: {}", node.node_type);
                    state.insert(node_id.clone(), serde_json::json!({}));
                }
            }
        }

        Ok(())
    }

    fn find_file_id_from_predecessors(&self, node_id: &str, edges: &[WorkflowEdge], state: &HashMap<String, serde_json::Value>) -> Option<String> {
        // Find edges where target_node == node_id
        for edge in edges {
            if edge.target_node == node_id {
                if let Some(parent_state) = state.get(&edge.source_node) {
                    if let Some(file_id) = parent_state.get("file_id").and_then(|v| v.as_str()) {
                        return Some(file_id.to_string());
                    }
                }
            }
        }
        None
    }
}
