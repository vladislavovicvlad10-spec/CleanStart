use serde::Serialize;
use std::io;
use thiserror::Error;

/// Unified error type for all CleanStart IPC commands.
///
/// Every command returns `AppResult<T>` so the frontend always receives a
/// human-readable message instead of a raw OS error.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("File system error: {0}")]
    Io(String),

    #[error("{0}")]
    InvalidInput(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Unsupported(String),

    #[error("{0}")]
    Internal(String),
}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        let message = match error.kind() {
            io::ErrorKind::PermissionDenied => {
                "Windows denied access. The item was skipped safely.".to_string()
            }
            io::ErrorKind::NotFound => "The item no longer exists.".to_string(),
            _ => error.to_string(),
        };
        AppError::Io(message)
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
