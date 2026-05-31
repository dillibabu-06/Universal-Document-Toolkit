export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: string;
  position_x: number;
  position_y: number;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node: string;
  target_node: string;
}
