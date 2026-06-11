//! Startup Analyzer backend.
//!
//! Reads real Windows startup entries from the Run registry keys and the
//! Startup folders. Enable/disable is implemented through the same
//! `StartupApproved` registry mechanism Task Manager uses, which means:
//!
//! * nothing is ever deleted — the original Run value / shortcut stays intact,
//! * every change is fully reversible from CleanStart or Task Manager,
//! * machine-wide (HKLM) entries are shown read-only because changing them
//!   requires administrator rights.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StartupLocation {
    RunKeyCurrentUser,
    RunKeyLocalMachine,
    RunKeyLocalMachine32,
    StartupFolderUser,
    StartupFolderCommon,
}

impl StartupLocation {
    pub fn label(&self) -> &'static str {
        match self {
            StartupLocation::RunKeyCurrentUser => "Registry · Current user",
            StartupLocation::RunKeyLocalMachine => "Registry · All users",
            StartupLocation::RunKeyLocalMachine32 => "Registry · All users (32-bit)",
            StartupLocation::StartupFolderUser => "Startup folder · Current user",
            StartupLocation::StartupFolderCommon => "Startup folder · All users",
        }
    }

    pub fn user_writable(&self) -> bool {
        matches!(
            self,
            StartupLocation::RunKeyCurrentUser | StartupLocation::StartupFolderUser
        )
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupEntry {
    pub id: String,
    /// Registry value name or startup-folder file name. Used as the toggle key.
    pub name: String,
    /// Human-friendly name (file extension stripped for folder shortcuts).
    pub display_name: String,
    pub command: String,
    pub location: StartupLocation,
    pub source: String,
    pub enabled: bool,
    pub can_toggle: bool,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StartupScanResult {
    pub entries: Vec<StartupEntry>,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub fn scan_startup_entries() -> AppResult<StartupScanResult> {
    #[cfg(windows)]
    {
        windows_impl::scan()
    }
    #[cfg(not(windows))]
    {
        Ok(StartupScanResult {
            entries: Vec::new(),
            warnings: vec!["Startup analysis is only available on Windows.".to_string()],
        })
    }
}

#[tauri::command]
pub fn set_startup_entry_enabled(
    location: StartupLocation,
    name: String,
    enabled: bool,
) -> AppResult<StartupEntry> {
    if name.trim().is_empty() || name.len() > 512 {
        return Err(AppError::InvalidInput(
            "invalid startup entry name".to_string(),
        ));
    }
    if !location.user_writable() {
        return Err(AppError::Unsupported(
            "Machine-wide startup entries require administrator rights, so CleanStart keeps them read-only.".to_string(),
        ));
    }

    #[cfg(windows)]
    {
        windows_impl::set_enabled(location, &name, enabled)
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err(AppError::Unsupported(
            "Startup management is only available on Windows.".to_string(),
        ))
    }
}

pub fn entry_id(location: StartupLocation, name: &str) -> String {
    let prefix = match location {
        StartupLocation::RunKeyCurrentUser => "hkcu-run",
        StartupLocation::RunKeyLocalMachine => "hklm-run",
        StartupLocation::RunKeyLocalMachine32 => "hklm-run32",
        StartupLocation::StartupFolderUser => "folder-user",
        StartupLocation::StartupFolderCommon => "folder-common",
    };
    let slug: String = name
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect();
    format!("{prefix}-{slug}")
}

/// First byte of a `StartupApproved` binary value: even = enabled, odd = disabled.
pub fn approval_byte_means_enabled(byte: u8) -> bool {
    byte % 2 == 0
}

#[cfg(windows)]
mod windows_impl {
    use super::*;
    use crate::util::friendly_path;
    use std::collections::HashMap;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};
    use winreg::enums::{
        HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, REG_BINARY, REG_EXPAND_SZ, REG_SZ,
    };
    use winreg::{RegKey, RegValue, HKEY};

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const RUN_KEY_32: &str = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";
    const APPROVED_RUN: &str =
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
    const APPROVED_RUN_32: &str =
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32";
    const APPROVED_FOLDER: &str =
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder";

    pub fn scan() -> AppResult<StartupScanResult> {
        let mut result = StartupScanResult::default();

        scan_run_key(
            HKEY_CURRENT_USER,
            RUN_KEY,
            HKEY_CURRENT_USER,
            APPROVED_RUN,
            StartupLocation::RunKeyCurrentUser,
            None,
            &mut result,
        );
        scan_run_key(
            HKEY_LOCAL_MACHINE,
            RUN_KEY,
            HKEY_LOCAL_MACHINE,
            APPROVED_RUN,
            StartupLocation::RunKeyLocalMachine,
            Some("Machine-wide entry. Changing it requires administrator rights, so it is shown read-only."),
            &mut result,
        );
        scan_run_key(
            HKEY_LOCAL_MACHINE,
            RUN_KEY_32,
            HKEY_LOCAL_MACHINE,
            APPROVED_RUN_32,
            StartupLocation::RunKeyLocalMachine32,
            Some("Machine-wide entry. Changing it requires administrator rights, so it is shown read-only."),
            &mut result,
        );

        if let Some(folder) = user_startup_folder() {
            scan_startup_folder(
                &folder,
                StartupLocation::StartupFolderUser,
                None,
                &mut result,
            );
        }
        if let Some(folder) = common_startup_folder() {
            scan_startup_folder(
                &folder,
                StartupLocation::StartupFolderCommon,
                Some("Shared startup shortcut for all users. Shown read-only."),
                &mut result,
            );
        }

        result
            .entries
            .sort_by(|a, b| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()));

        Ok(result)
    }

    pub fn set_enabled(
        location: StartupLocation,
        name: &str,
        enabled: bool,
    ) -> AppResult<StartupEntry> {
        match location {
            StartupLocation::RunKeyCurrentUser => set_run_value_enabled(name, enabled),
            StartupLocation::StartupFolderUser => set_folder_entry_enabled(name, enabled),
            _ => Err(AppError::Unsupported(
                "This startup entry is read-only.".to_string(),
            )),
        }
    }

    fn set_run_value_enabled(name: &str, enabled: bool) -> AppResult<StartupEntry> {
        let run = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(RUN_KEY, KEY_READ)
            .map_err(|error| AppError::Io(format!("could not open Run key: {error}")))?;

        // Match the value name case-insensitively against real entries only.
        let (actual_name, command) = read_string_values(&run)
            .into_iter()
            .find(|(value_name, _)| value_name.eq_ignore_ascii_case(name))
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Startup entry '{name}' was not found. Rescan and try again."
                ))
            })?;

        write_approval(HKEY_CURRENT_USER, APPROVED_RUN, &actual_name, enabled)?;

        Ok(StartupEntry {
            id: entry_id(StartupLocation::RunKeyCurrentUser, &actual_name),
            display_name: actual_name.clone(),
            name: actual_name,
            command,
            location: StartupLocation::RunKeyCurrentUser,
            source: StartupLocation::RunKeyCurrentUser.label().to_string(),
            enabled,
            can_toggle: true,
            note: None,
        })
    }

    fn set_folder_entry_enabled(name: &str, enabled: bool) -> AppResult<StartupEntry> {
        let folder = user_startup_folder().ok_or_else(|| {
            AppError::NotFound("The user Startup folder could not be located.".to_string())
        })?;

        let file = std::fs::read_dir(&folder)
            .map_err(AppError::from)?
            .flatten()
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .map(|file_name| file_name.to_string_lossy().eq_ignore_ascii_case(name))
                    .unwrap_or(false)
            })
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Startup shortcut '{name}' was not found. Rescan and try again."
                ))
            })?;

        let actual_name = file
            .file_name()
            .map(|file_name| file_name.to_string_lossy().to_string())
            .unwrap_or_else(|| name.to_string());

        write_approval(HKEY_CURRENT_USER, APPROVED_FOLDER, &actual_name, enabled)?;

        Ok(StartupEntry {
            id: entry_id(StartupLocation::StartupFolderUser, &actual_name),
            display_name: display_name_for_file(&actual_name),
            name: actual_name,
            command: friendly_path(&file),
            location: StartupLocation::StartupFolderUser,
            source: StartupLocation::StartupFolderUser.label().to_string(),
            enabled,
            can_toggle: true,
            note: None,
        })
    }

    fn write_approval(hive: HKEY, key_path: &str, name: &str, enabled: bool) -> AppResult<()> {
        let (key, _) = RegKey::predef(hive)
            .create_subkey(key_path)
            .map_err(|error| AppError::Io(format!("could not open StartupApproved: {error}")))?;

        let bytes = approval_bytes(enabled);
        key.set_raw_value(
            name,
            &RegValue {
                bytes,
                vtype: REG_BINARY,
            },
        )
        .map_err(|error| AppError::Io(format!("could not update startup state: {error}")))?;
        Ok(())
    }

    fn approval_bytes(enabled: bool) -> Vec<u8> {
        let mut bytes = vec![0u8; 12];
        if enabled {
            bytes[0] = 0x02;
        } else {
            bytes[0] = 0x03;
            let filetime = filetime_now();
            bytes[4..12].copy_from_slice(&filetime.to_le_bytes());
        }
        bytes
    }

    fn filetime_now() -> u64 {
        const EPOCH_DIFFERENCE_SECS: u64 = 11_644_473_600;
        let unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or(0);
        (unix + EPOCH_DIFFERENCE_SECS).saturating_mul(10_000_000)
    }

    fn scan_run_key(
        hive: HKEY,
        key_path: &str,
        approval_hive: HKEY,
        approval_path: &str,
        location: StartupLocation,
        note: Option<&str>,
        result: &mut StartupScanResult,
    ) {
        let key = match RegKey::predef(hive).open_subkey_with_flags(key_path, KEY_READ) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return,
            Err(error) => {
                result
                    .warnings
                    .push(format!("{} skipped: {}", location.label(), error));
                return;
            }
        };

        let approvals = read_approvals(approval_hive, approval_path);

        for (name, command) in read_string_values(&key) {
            let enabled = approvals
                .get(&name.to_lowercase())
                .copied()
                .unwrap_or(true);
            result.entries.push(StartupEntry {
                id: entry_id(location, &name),
                display_name: name.clone(),
                name,
                command,
                location,
                source: location.label().to_string(),
                enabled,
                can_toggle: location.user_writable(),
                note: note.map(str::to_string),
            });
        }
    }

    fn scan_startup_folder(
        folder: &Path,
        location: StartupLocation,
        note: Option<&str>,
        result: &mut StartupScanResult,
    ) {
        let entries = match std::fs::read_dir(folder) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return,
            Err(error) => {
                result
                    .warnings
                    .push(format!("{} skipped: {}", location.label(), error));
                return;
            }
        };

        let approvals = read_approvals(HKEY_CURRENT_USER, APPROVED_FOLDER);

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = match path.file_name() {
                Some(file_name) => file_name.to_string_lossy().to_string(),
                None => continue,
            };
            if file_name.eq_ignore_ascii_case("desktop.ini") || !path.is_file() {
                continue;
            }

            let enabled = approvals
                .get(&file_name.to_lowercase())
                .copied()
                .unwrap_or(true);

            result.entries.push(StartupEntry {
                id: entry_id(location, &file_name),
                display_name: display_name_for_file(&file_name),
                name: file_name,
                command: friendly_path(&path),
                location,
                source: location.label().to_string(),
                enabled,
                can_toggle: location.user_writable(),
                note: note.map(str::to_string),
            });
        }
    }

    fn read_string_values(key: &RegKey) -> Vec<(String, String)> {
        key.enum_values()
            .flatten()
            .filter_map(|(name, value)| match value.vtype {
                REG_SZ | REG_EXPAND_SZ => {
                    let text = reg_value_to_string(&value);
                    (!name.trim().is_empty()).then_some((name, text))
                }
                _ => None,
            })
            .collect()
    }

    fn reg_value_to_string(value: &RegValue) -> String {
        let wide: Vec<u16> = value
            .bytes
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .take_while(|&unit| unit != 0)
            .collect();
        String::from_utf16_lossy(&wide)
    }

    fn read_approvals(hive: HKEY, key_path: &str) -> HashMap<String, bool> {
        let mut approvals = HashMap::new();
        let key = match RegKey::predef(hive).open_subkey_with_flags(key_path, KEY_READ) {
            Ok(key) => key,
            Err(_) => return approvals,
        };
        for (name, value) in key.enum_values().flatten() {
            if value.vtype == REG_BINARY {
                let enabled = value
                    .bytes
                    .first()
                    .map(|&byte| approval_byte_means_enabled(byte))
                    .unwrap_or(true);
                approvals.insert(name.to_lowercase(), enabled);
            }
        }
        approvals
    }

    fn display_name_for_file(file_name: &str) -> String {
        Path::new(file_name)
            .file_stem()
            .map(|stem| stem.to_string_lossy().to_string())
            .unwrap_or_else(|| file_name.to_string())
    }

    fn user_startup_folder() -> Option<PathBuf> {
        std::env::var("APPDATA").ok().map(|appdata| {
            PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup")
        })
    }

    fn common_startup_folder() -> Option<PathBuf> {
        std::env::var("ProgramData").ok().map(|program_data| {
            PathBuf::from(program_data).join(r"Microsoft\Windows\Start Menu\Programs\StartUp")
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn approval_byte_parsing_matches_task_manager_semantics() {
        assert!(approval_byte_means_enabled(0x02));
        assert!(approval_byte_means_enabled(0x06));
        assert!(!approval_byte_means_enabled(0x03));
        assert!(!approval_byte_means_enabled(0x07));
    }

    #[test]
    fn machine_wide_locations_are_not_writable() {
        assert!(!StartupLocation::RunKeyLocalMachine.user_writable());
        assert!(!StartupLocation::RunKeyLocalMachine32.user_writable());
        assert!(!StartupLocation::StartupFolderCommon.user_writable());
        assert!(StartupLocation::RunKeyCurrentUser.user_writable());
        assert!(StartupLocation::StartupFolderUser.user_writable());
    }

    #[test]
    fn toggling_machine_entries_is_rejected() {
        let result = set_startup_entry_enabled(
            StartupLocation::RunKeyLocalMachine,
            "AnyEntry".to_string(),
            false,
        );
        assert!(matches!(result, Err(AppError::Unsupported(_))));
    }

    #[test]
    fn entry_ids_are_stable_and_sanitized() {
        assert_eq!(
            entry_id(StartupLocation::RunKeyCurrentUser, "One Drive!"),
            "hkcu-run-one-drive-"
        );
    }
}
