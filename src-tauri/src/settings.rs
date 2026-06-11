//! App settings persisted locally as JSON.
//!
//! Safety note: `move_to_recycle_bin` is always forced to `true` when saving.
//! Permanent deletion is disabled by design in CleanStart 1.x.

use crate::cleanup;
use crate::error::{AppError, AppResult};
use crate::util::app_data_dir;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub move_to_recycle_bin: bool,
    pub theme: String,
    pub launch_at_startup: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            move_to_recycle_bin: true,
            theme: "dark".to_string(),
            launch_at_startup: false,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedLocation {
    pub name: String,
    pub description: String,
    pub display_path: String,
    pub exists: bool,
    pub cleanable: bool,
    pub protected: bool,
}

fn settings_path() -> PathBuf {
    app_data_dir().join("settings.json")
}

pub fn load_settings() -> AppSettings {
    match fs::read_to_string(settings_path()) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

fn store_settings(settings: &AppSettings) -> AppResult<()> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(settings)
        .map_err(|error| AppError::Internal(format!("could not encode settings: {error}")))?;
    fs::write(path, text)?;
    Ok(())
}

#[tauri::command]
pub fn get_app_settings() -> AppSettings {
    load_settings()
}

#[tauri::command]
pub fn save_app_settings(settings: AppSettings) -> AppResult<AppSettings> {
    let mut settings = settings;

    // Permanent deletion stays disabled regardless of what the UI sends.
    settings.move_to_recycle_bin = true;

    if settings.theme != "dark" && settings.theme != "light" {
        return Err(AppError::InvalidInput(format!(
            "unknown theme '{}'",
            settings.theme
        )));
    }

    store_settings(&settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn get_approved_cleanup_locations() -> Vec<ApprovedLocation> {
    cleanup::approved_roots()
        .into_iter()
        .map(|root| ApprovedLocation {
            exists: root.protected || root.path.exists(),
            display_path: cleanup::display_path(&root.path),
            name: root.name,
            description: root.description,
            cleanable: root.cleanable,
            protected: root.protected,
        })
        .collect()
}

#[cfg(windows)]
#[tauri::command]
pub fn set_launch_at_startup(enabled: bool) -> AppResult<bool> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
    use winreg::RegKey;

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const VALUE_NAME: &str = "CleanStart";

    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        .map_err(|error| AppError::Io(format!("could not open startup registry key: {error}")))?;

    if enabled {
        let exe = std::env::current_exe()
            .map_err(|error| AppError::Internal(format!("could not locate CleanStart: {error}")))?;
        let command = format!("\"{}\"", exe.to_string_lossy());
        key.set_value(VALUE_NAME, &command)
            .map_err(|error| AppError::Io(format!("could not register startup entry: {error}")))?;
    } else {
        match key.delete_value(VALUE_NAME) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => {
                return Err(AppError::Io(format!(
                    "could not remove startup entry: {error}"
                )))
            }
        }
    }

    let mut settings = load_settings();
    settings.launch_at_startup = enabled;
    store_settings(&settings)?;

    Ok(enabled)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn set_launch_at_startup(_enabled: bool) -> AppResult<bool> {
    Err(AppError::Unsupported(
        "Launch at startup is only available on Windows.".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_use_recycle_bin_and_dark_theme() {
        let settings = AppSettings::default();
        assert!(settings.move_to_recycle_bin);
        assert_eq!(settings.theme, "dark");
        assert!(!settings.launch_at_startup);
    }

    #[test]
    fn legacy_settings_file_still_parses() {
        let parsed: AppSettings = serde_json::from_str(r#"{ "moveToRecycleBin": true }"#).unwrap();
        assert!(parsed.move_to_recycle_bin);
        assert_eq!(parsed.theme, "dark");
    }

    #[test]
    fn approved_locations_are_reported() {
        let locations = get_approved_cleanup_locations();
        assert!(!locations.is_empty());
        assert!(locations.iter().any(|location| location.protected));
    }
}
