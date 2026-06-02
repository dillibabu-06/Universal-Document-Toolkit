export interface Vault {
  id: string;
  workspace_id: string;
  name: string;
  salt: string;
  created_at: number;
}

export interface VaultDocument {
  id: string;
  vault_id: string;
  original_filename: string;
  original_path: string;
  encrypted_path: string;
  size?: number;
  added_at: number;
}
