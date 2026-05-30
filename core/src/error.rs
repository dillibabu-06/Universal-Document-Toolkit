use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Indexing error: {0}")]
    Indexing(String),

    #[error("Automation error: {0}")]
    Automation(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Workspace error: {0}")]
    Workspace(String),

    #[error("File error: {0}")]
    File(String),

    #[error("Generic error: {0}")]
    Generic(String),
}

pub type Result<T> = std::result::Result<T, AppError>;
