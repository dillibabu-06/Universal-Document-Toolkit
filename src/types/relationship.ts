export interface DocumentRelationship {
  id: string;
  source_file_id: string;
  target_file_id: string;
  relationship_type: string;
  created_at: number;
}
