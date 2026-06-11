//! Local-only activity history.
//!
//! Every scan and cleanup is recorded to a JSON file inside the CleanStart
//! app-data folder. Nothing is ever transmitted anywhere.

use crate::error::{AppError, AppResult};
use crate::util::{app_data_dir, unix_millis};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU32, Ordering},
    sync::Mutex,
};

const MAX_ENTRIES: usize = 500;
const MAX_TEXT_LENGTH: usize = 4_000;

static LOG_LOCK: Mutex<()> = Mutex::new(());
static SEQUENCE: AtomicU32 = AtomicU32::new(0);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: String,
    pub timestamp_ms: u64,
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub status: String,
    #[serde(default)]
    pub bytes_freed: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewActivityEntry {
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub status: String,
    #[serde(default)]
    pub bytes_freed: Option<u64>,
}

const ALLOWED_KINDS: [&str; 6] = ["scan", "cleanup", "startup", "disk", "settings", "app"];
const ALLOWED_STATUSES: [&str; 4] = ["info", "success", "warning", "error"];

fn log_path() -> PathBuf {
    app_data_dir().join("activity-log.json")
}

fn load_entries() -> Vec<ActivityEntry> {
    match fs::read_to_string(log_path()) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn store_entries(entries: &[ActivityEntry]) -> AppResult<()> {
    let path = log_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(entries)
        .map_err(|error| AppError::Internal(format!("could not encode activity log: {error}")))?;
    fs::write(path, text)?;
    Ok(())
}

fn validate_entry(entry: &NewActivityEntry) -> AppResult<()> {
    if !ALLOWED_KINDS.contains(&entry.kind.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unknown activity kind '{}'",
            entry.kind
        )));
    }
    if !ALLOWED_STATUSES.contains(&entry.status.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unknown activity status '{}'",
            entry.status
        )));
    }
    if entry.title.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "activity title must not be empty".to_string(),
        ));
    }
    if entry.title.len() > MAX_TEXT_LENGTH || entry.detail.len() > MAX_TEXT_LENGTH {
        return Err(AppError::InvalidInput(
            "activity entry text is too long".to_string(),
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn log_activity(entry: NewActivityEntry) -> AppResult<ActivityEntry> {
    validate_entry(&entry)?;

    let _guard = LOG_LOCK
        .lock()
        .map_err(|_| AppError::Internal("activity log is busy".to_string()))?;

    let timestamp = unix_millis();
    let sequence = SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let record = ActivityEntry {
        id: format!("{timestamp}-{sequence:04}"),
        timestamp_ms: timestamp,
        kind: entry.kind,
        title: entry.title,
        detail: entry.detail,
        status: entry.status,
        bytes_freed: entry.bytes_freed,
    };

    let mut entries = load_entries();
    entries.insert(0, record.clone());
    entries.truncate(MAX_ENTRIES);
    store_entries(&entries)?;

    Ok(record)
}

#[tauri::command]
pub fn get_activity_log() -> AppResult<Vec<ActivityEntry>> {
    let _guard = LOG_LOCK
        .lock()
        .map_err(|_| AppError::Internal("activity log is busy".to_string()))?;
    Ok(load_entries())
}

#[tauri::command]
pub fn clear_activity_log() -> AppResult<()> {
    let _guard = LOG_LOCK
        .lock()
        .map_err(|_| AppError::Internal("activity log is busy".to_string()))?;
    store_entries(&[])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(kind: &str, status: &str) -> NewActivityEntry {
        NewActivityEntry {
            kind: kind.to_string(),
            title: "Test entry".to_string(),
            detail: "Detail".to_string(),
            status: status.to_string(),
            bytes_freed: None,
        }
    }

    #[test]
    fn rejects_unknown_kind() {
        assert!(validate_entry(&sample("telemetry", "info")).is_err());
    }

    #[test]
    fn rejects_unknown_status() {
        assert!(validate_entry(&sample("scan", "panic")).is_err());
    }

    #[test]
    fn accepts_valid_entry() {
        assert!(validate_entry(&sample("cleanup", "success")).is_ok());
    }
}
