use rusqlite::{params, Connection, Result};
use sdw_core::models::{Vault, VaultDocument};

pub struct VaultRepository<'a> {
    conn: &'a Connection,
}

impl<'a> VaultRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create_vault(&self, vault: &Vault) -> Result<()> {
        self.conn.execute(
            "INSERT INTO vaults (id, workspace_id, name, salt, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                vault.id,
                vault.workspace_id,
                vault.name,
                vault.salt,
                vault.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_vault(&self, vault_id: &str) -> Result<Vault> {
        self.conn.query_row(
            "SELECT id, workspace_id, name, salt, created_at FROM vaults WHERE id = ?1",
            params![vault_id],
            |row| {
                Ok(Vault {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    salt: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
    }

    pub fn list_vaults(&self, workspace_id: &str) -> Result<Vec<Vault>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, salt, created_at FROM vaults WHERE workspace_id = ?1 ORDER BY name ASC"
        )?;
        let vault_iter = stmt.query_map(params![workspace_id], |row| {
            Ok(Vault {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                salt: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;

        let mut vaults = Vec::new();
        for v in vault_iter {
            vaults.push(v?);
        }
        Ok(vaults)
    }

    pub fn add_document(&self, doc: &VaultDocument) -> Result<()> {
        self.conn.execute(
            "INSERT INTO vault_documents (id, vault_id, original_filename, original_path, encrypted_path, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                doc.id,
                doc.vault_id,
                doc.original_filename,
                doc.original_path,
                doc.encrypted_path,
                doc.added_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_document(&self, doc_id: &str) -> Result<VaultDocument> {
        self.conn.query_row(
            "SELECT id, vault_id, original_filename, original_path, encrypted_path, added_at FROM vault_documents WHERE id = ?1",
            params![doc_id],
            |row| {
                Ok(VaultDocument {
                    id: row.get(0)?,
                    vault_id: row.get(1)?,
                    original_filename: row.get(2)?,
                    original_path: row.get(3)?,
                    encrypted_path: row.get(4)?,
                    added_at: row.get(5)?,
                })
            },
        )
    }

    pub fn list_documents(&self, vault_id: &str) -> Result<Vec<VaultDocument>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, vault_id, original_filename, original_path, encrypted_path, added_at FROM vault_documents WHERE vault_id = ?1 ORDER BY added_at DESC"
        )?;
        let doc_iter = stmt.query_map(params![vault_id], |row| {
            Ok(VaultDocument {
                id: row.get(0)?,
                vault_id: row.get(1)?,
                original_filename: row.get(2)?,
                original_path: row.get(3)?,
                encrypted_path: row.get(4)?,
                added_at: row.get(5)?,
            })
        })?;

        let mut docs = Vec::new();
        for d in doc_iter {
            docs.push(d?);
        }
        Ok(docs)
    }
}
