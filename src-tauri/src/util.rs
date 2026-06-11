use std::{
    env,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

/// Directory where CleanStart stores its local-only data
/// (settings, activity history). No data ever leaves this machine.
pub fn app_data_dir() -> PathBuf {
    if let Ok(local) = env::var("LOCALAPPDATA") {
        return PathBuf::from(local).join("CleanStart");
    }
    if let Ok(home) = env::var("HOME") {
        return PathBuf::from(home).join(".cleanstart");
    }
    env::temp_dir().join("CleanStart")
}

/// The current user's home directory (`%USERPROFILE%` on Windows).
pub fn home_dir() -> Option<PathBuf> {
    env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .ok()
        .map(PathBuf::from)
}

/// Milliseconds since the Unix epoch, used for activity timestamps.
pub fn unix_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

/// Renders a path with the home directory collapsed to `%USERPROFILE%`
/// and any Windows verbatim prefix removed.
pub fn friendly_path(path: &Path) -> String {
    let text = strip_verbatim(&path.to_string_lossy());
    if let Some(home) = home_dir() {
        let home_text = strip_verbatim(&home.to_string_lossy());
        if !home_text.is_empty() && text.starts_with(&home_text) {
            return format!("%USERPROFILE%{}", &text[home_text.len()..]);
        }
    }
    text
}

/// Removes `\\?\` / `\\?\UNC\` verbatim prefixes from a Windows path string.
pub fn strip_verbatim(path: &str) -> String {
    if let Some(stripped) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{}", stripped);
    }
    if let Some(stripped) = path.strip_prefix(r"\\?\") {
        return stripped.to_string();
    }
    path.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_verbatim_removes_prefix() {
        assert_eq!(strip_verbatim(r"\\?\C:\Temp"), r"C:\Temp");
        assert_eq!(strip_verbatim(r"\\?\UNC\server\share"), r"\\server\share");
        assert_eq!(strip_verbatim(r"C:\Temp"), r"C:\Temp");
    }

    #[test]
    fn app_data_dir_is_not_empty() {
        assert!(!app_data_dir().as_os_str().is_empty());
    }
}
