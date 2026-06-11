use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    env, fs, io,
    path::{Path, PathBuf},
    time::{Duration, Instant, SystemTime},
};

const MAX_FILES_PER_ROOT: usize = 15_000;
const MAX_DEPTH: usize = 10;
const MAX_SCAN_DURATION: Duration = Duration::from_secs(8);
const REPARSE_POINT_ATTRIBUTE: u32 = 0x400;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum CleanupCategory {
    Windows,
    Browsers,
    Applications,
    System,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CleanupItemType {
    File,
    Folder,
    Group,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: CleanupCategory,
    pub source: String,
    pub path: String,
    pub display_path: String,
    pub size_bytes: u64,
    pub items_count: u64,
    pub item_type: CleanupItemType,
    pub cleanable: bool,
    pub protected: bool,
    pub selected_by_default: bool,
    pub skip_reason: Option<String>,
    pub warning: Option<String>,
    pub last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub scanned_count: u64,
    pub total_size_bytes: u64,
    pub cleanable_count: u64,
    pub protected_count: u64,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
    pub items: Vec<CleanupItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DryRunResult {
    pub selected_count: u64,
    pub selected_size_bytes: u64,
    pub cleanable_count: u64,
    pub skipped_count: u64,
    pub warnings: Vec<String>,
    pub skipped_items: Vec<CleanupOutcomeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanResult {
    pub removed_count: u64,
    pub removed_size_bytes: u64,
    pub failed_count: u64,
    pub skipped_count: u64,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
    pub removed_items: Vec<CleanupOutcomeItem>,
    pub failed_items: Vec<CleanupOutcomeItem>,
    pub skipped_items: Vec<CleanupOutcomeItem>,
    pub locked_items: Vec<CleanupOutcomeItem>,
    pub permission_denied_items: Vec<CleanupOutcomeItem>,
    pub protected_items: Vec<CleanupOutcomeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupOutcomeItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupOptions {
    pub move_to_recycle_bin: bool,
}

#[derive(Debug, Clone)]
pub(crate) struct CleanupRoot {
    pub(crate) name: String,
    pub(crate) description: String,
    pub(crate) category: CleanupCategory,
    pub(crate) source: String,
    pub(crate) path: PathBuf,
    pub(crate) selected_by_default: bool,
    pub(crate) cleanable: bool,
    pub(crate) protected: bool,
    pub(crate) skip_reason: Option<String>,
    pub(crate) warning: Option<String>,
}

#[derive(Debug, Clone, Default)]
struct ScanStats {
    size_bytes: u64,
    items_count: u64,
    last_modified: Option<SystemTime>,
    warnings: Vec<String>,
    errors: Vec<String>,
}

#[tauri::command]
pub fn scan_temp_preview() -> CleanupResult {
    let mut result = CleanupResult::default();
    let mut seen_roots = HashSet::new();

    for root in approved_roots() {
        if root.protected {
            result.items.push(root_to_item(root, ScanStats::default()));
            result.protected_count += 1;
            continue;
        }

        if !root.path.exists() {
            continue;
        }

        let canonical = match fs::canonicalize(&root.path) {
            Ok(path) => path,
            Err(error) => {
                result.warnings.push(format!(
                    "{} was skipped: {}",
                    root.source,
                    classify_io_error(error)
                ));
                continue;
            }
        };

        if !seen_roots.insert(path_dedupe_key(&canonical)) {
            continue;
        }

        let mut root = root;
        root.path = canonical.clone();

        let stats = match scan_root(&canonical) {
            Ok(stats) => stats,
            Err(error) => {
                result
                    .warnings
                    .push(format!("{} was skipped: {}", root.source, error));
                continue;
            }
        };

        result.warnings.extend(stats.warnings.iter().cloned());
        result.errors.extend(stats.errors.iter().cloned());

        if stats.items_count == 0 && stats.size_bytes == 0 {
            continue;
        }

        if root.cleanable {
            result.cleanable_count += 1;
        } else {
            result.protected_count += 1;
        }
        result.scanned_count += stats.items_count;
        result.total_size_bytes += stats.size_bytes;
        result.items.push(root_to_item(root, stats));
    }

    if result.items.is_empty() {
        result
            .warnings
            .push("No safe temporary files were found in approved locations.".to_string());
    }

    result
}

#[tauri::command]
pub fn dry_run_cleanup(selected_items: Vec<CleanupItem>) -> DryRunResult {
    let mut result = DryRunResult {
        selected_count: selected_items.len() as u64,
        selected_size_bytes: 0,
        cleanable_count: 0,
        skipped_count: 0,
        warnings: Vec::new(),
        skipped_items: Vec::new(),
    };

    for item in selected_items {
        match validate_selected_item(&item) {
            Ok(_) if item.cleanable && !item.protected => {
                result.cleanable_count += 1;
                result.selected_size_bytes +=
                    current_size_for_item(&item).unwrap_or(item.size_bytes);
            }
            Ok(_) => {
                result.skipped_count += 1;
                result.skipped_items.push(outcome_item(
                    &item,
                    Some("Item is protected or not cleanable.".to_string()),
                ));
            }
            Err(reason) => {
                result.skipped_count += 1;
                result
                    .warnings
                    .push(format!("{} skipped: {}", item.name, reason));
                result.skipped_items.push(outcome_item(&item, Some(reason)));
            }
        }
    }

    result
}

#[tauri::command]
pub fn clean_selected_items(
    selected_items: Vec<CleanupItem>,
    options: CleanupOptions,
) -> CleanResult {
    let mut result = CleanResult::default();

    if selected_items.is_empty() {
        result
            .warnings
            .push("Select safe temporary items before cleanup.".to_string());
        return result;
    }

    if !options.move_to_recycle_bin {
        result.warnings.push(
            "Permanent deletion is disabled in this alpha build. Enable Recycle Bin cleanup to continue."
                .to_string(),
        );
        result.skipped_count = selected_items.len() as u64;
        result.skipped_items = selected_items
            .iter()
            .map(|item| outcome_item(item, Some("Permanent deletion disabled.".to_string())))
            .collect();
        return result;
    }

    let mut processed_paths = HashSet::new();

    for item in selected_items {
        let canonical = match validate_selected_item(&item) {
            Ok(path) => path,
            Err(reason) => {
                result.skipped_count += 1;
                result
                    .skipped_items
                    .push(outcome_item(&item, Some(reason.clone())));
                result
                    .warnings
                    .push(format!("{} skipped: {}", item.name, reason));
                continue;
            }
        };

        if item.protected || !item.cleanable {
            result.skipped_count += 1;
            let protected_item = outcome_item(
                &item,
                Some("Item is protected or not cleanable.".to_string()),
            );
            result.protected_items.push(protected_item.clone());
            result.skipped_items.push(protected_item);
            continue;
        }

        let targets = match cleanup_targets(&item, &canonical) {
            Ok(targets) => targets,
            Err(reason) => {
                if is_exact_approved_root(&canonical) {
                    result.skipped_count += 1;
                    result.warnings.push(format!(
                        "{} could not be enumerated safely: {}",
                        display_path(&canonical),
                        reason
                    ));
                    result.skipped_items.push(outcome_item(&item, Some(reason)));
                } else {
                    record_failed_target(&item, &canonical, reason, &mut result);
                }
                continue;
            }
        };

        for target in targets {
            process_cleanup_target(
                &item,
                &target,
                &canonical,
                &mut processed_paths,
                &mut result,
            );
        }
    }

    retry_failed_items(&mut result);

    result
}

pub(crate) fn approved_roots() -> Vec<CleanupRoot> {
    let mut roots = Vec::new();

    if let Ok(temp) = env::var("TEMP") {
        roots.push(root(
            "Windows Temp Files",
            "User temporary files from %TEMP%",
            CleanupCategory::Windows,
            "%TEMP%",
            PathBuf::from(temp),
            true,
        ));
    }

    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let local = PathBuf::from(local_app_data);
        roots.push(root(
            "Local AppData Temp",
            "Temporary files from %LOCALAPPDATA%\\Temp",
            CleanupCategory::Windows,
            "%LOCALAPPDATA%\\Temp",
            local.join("Temp"),
            true,
        ));

        add_browser_roots(&mut roots, &local);
        add_user_wer_roots(&mut roots, &local);
    }

    roots.push(CleanupRoot {
        selected_by_default: false,
        warning: Some("Review Windows system temp entries carefully. Locked or admin-required files are skipped.".to_string()),
        ..root(
            "Windows System Temp",
            "Accessible entries from C:\\Windows\\Temp",
            CleanupCategory::Windows,
            "C:\\Windows\\Temp",
            PathBuf::from(r"C:\Windows\Temp"),
            false,
        )
    });

    roots.push(CleanupRoot {
        name: "Recycle Bin".to_string(),
        description: "Recycle Bin preview is protected in this alpha build.".to_string(),
        category: CleanupCategory::System,
        source: "Recycle Bin".to_string(),
        path: PathBuf::from("Recycle Bin"),
        selected_by_default: false,
        cleanable: false,
        protected: true,
        skip_reason: Some("Recycle Bin emptying is not implemented yet.".to_string()),
        warning: Some("Recycle Bin is shown as preview-only for now.".to_string()),
    });

    roots
}

fn root(
    name: &str,
    description: &str,
    category: CleanupCategory,
    source: &str,
    path: PathBuf,
    selected_by_default: bool,
) -> CleanupRoot {
    CleanupRoot {
        name: name.to_string(),
        description: description.to_string(),
        category,
        source: source.to_string(),
        path,
        selected_by_default,
        cleanable: true,
        protected: false,
        skip_reason: None,
        warning: None,
    }
}

fn add_browser_roots(roots: &mut Vec<CleanupRoot>, local: &Path) {
    let browsers = [
        (
            "Microsoft Edge Cache",
            "Microsoft Edge browser cache only. Cookies, passwords, history, and sessions are not targeted.",
            vec![
                local.join(r"Microsoft\Edge\User Data\Default\Cache"),
                local.join(r"Microsoft\Edge\User Data\Default\Code Cache"),
                local.join(r"Microsoft\Edge\User Data\Default\GPUCache"),
                local.join(r"Microsoft\Edge\User Data\Default\Service Worker\CacheStorage"),
            ],
        ),
        (
            "Google Chrome Cache",
            "Google Chrome browser cache only. Cookies, passwords, history, and sessions are not targeted.",
            vec![
                local.join(r"Google\Chrome\User Data\Default\Cache"),
                local.join(r"Google\Chrome\User Data\Default\Code Cache"),
                local.join(r"Google\Chrome\User Data\Default\GPUCache"),
                local.join(r"Google\Chrome\User Data\Default\Service Worker\CacheStorage"),
            ],
        ),
        (
            "Brave Cache",
            "Brave browser cache only. Cookies, passwords, history, and sessions are not targeted.",
            vec![
                local.join(r"BraveSoftware\Brave-Browser\User Data\Default\Cache"),
                local.join(r"BraveSoftware\Brave-Browser\User Data\Default\Code Cache"),
                local.join(r"BraveSoftware\Brave-Browser\User Data\Default\GPUCache"),
            ],
        ),
    ];

    for (browser_name, description, paths) in browsers {
        for path in paths {
            let source = path.to_string_lossy().to_string();
            roots.push(root(
                browser_name,
                description,
                CleanupCategory::Browsers,
                &source,
                path,
                true,
            ));
        }
    }

    let profiles = local.join(r"Mozilla\Firefox\Profiles");
    if let Ok(entries) = fs::read_dir(profiles) {
        for entry in entries.flatten() {
            let profile = entry.path();
            if profile.is_dir() {
                for child in ["cache2", "startupCache"] {
                    let path = profile.join(child);
                    let source = path.to_string_lossy().to_string();
                    roots.push(root(
                        "Firefox Cache",
                        "Firefox browser cache only. Cookies, passwords, history, and sessions are not targeted.",
                        CleanupCategory::Browsers,
                        &source,
                        path,
                        true,
                    ));
                }
            }
        }
    }
}

fn add_user_wer_roots(roots: &mut Vec<CleanupRoot>, local: &Path) {
    for child in ["ReportArchive", "ReportQueue", "Temp"] {
        let path = local.join(r"Microsoft\Windows\WER").join(child);
        let source = path.to_string_lossy().to_string();
        roots.push(root(
            "Windows Error Reports",
            "User-accessible Windows Error Reporting files.",
            CleanupCategory::System,
            &source,
            path,
            false,
        ));
    }
}

fn root_to_item(root: CleanupRoot, stats: ScanStats) -> CleanupItem {
    let canonical = fs::canonicalize(&root.path).unwrap_or_else(|_| root.path.clone());
    CleanupItem {
        id: stable_id(&root.source, &canonical),
        name: root.name,
        description: root.description,
        category: root.category,
        source: root.source,
        path: canonical.to_string_lossy().to_string(),
        display_path: display_path(&canonical),
        size_bytes: stats.size_bytes,
        items_count: stats.items_count,
        item_type: CleanupItemType::Group,
        cleanable: root.cleanable,
        protected: root.protected,
        selected_by_default: root.selected_by_default && root.cleanable && !root.protected,
        skip_reason: root.skip_reason,
        warning: root.warning,
        last_modified: stats.last_modified.and_then(system_time_to_string),
    }
}

fn scan_root(path: &Path) -> Result<ScanStats, String> {
    let canonical = fs::canonicalize(path).map_err(classify_io_error)?;
    ensure_not_reparse_point(&canonical).map_err(|error| error.to_string())?;
    if !is_inside_approved_root(&canonical) {
        return Err("path is outside approved cleanup roots".to_string());
    }

    let start = Instant::now();
    let mut stats = ScanStats::default();
    let mut stack = vec![(canonical, 0usize)];

    while let Some((current, depth)) = stack.pop() {
        if stats.items_count as usize >= MAX_FILES_PER_ROOT {
            stats
                .warnings
                .push(format!("Scan limit reached for {}", display_path(path)));
            break;
        }
        if start.elapsed() > MAX_SCAN_DURATION {
            stats.warnings.push(format!(
                "Scan time limit reached for {}",
                display_path(path)
            ));
            break;
        }
        if depth > MAX_DEPTH {
            stats
                .warnings
                .push(format!("Skipped deep folder {}", display_path(&current)));
            continue;
        }

        let entries = match fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(error) => {
                stats.warnings.push(format!(
                    "{} skipped: {}",
                    display_path(&current),
                    classify_io_error(error)
                ));
                continue;
            }
        };

        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    stats.warnings.push(format!(
                        "Directory entry skipped: {}",
                        classify_io_error(error)
                    ));
                    continue;
                }
            };
            let path = entry.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(error) => {
                    stats.warnings.push(format!(
                        "{} skipped: {}",
                        display_path(&path),
                        classify_io_error(error)
                    ));
                    continue;
                }
            };

            if is_reparse_or_symlink(&metadata) {
                stats.warnings.push(format!(
                    "Skipped link/reparse point {}",
                    display_path(&path)
                ));
                continue;
            }

            stats.items_count += 1;
            stats.last_modified = newest_time(stats.last_modified, metadata.modified().ok());

            if metadata.is_file() {
                stats.size_bytes += metadata.len();
            } else if metadata.is_dir() {
                stack.push((path, depth + 1));
            }
        }
    }

    Ok(stats)
}

fn validate_selected_item(item: &CleanupItem) -> Result<PathBuf, String> {
    if item.path.trim().is_empty() || item.path.eq_ignore_ascii_case("Recycle Bin") {
        return Err("preview-only item".to_string());
    }

    let path = PathBuf::from(&item.path);
    if !path.exists() {
        return Err("missing".to_string());
    }

    let canonical = fs::canonicalize(&path).map_err(classify_io_error)?;
    reject_dangerous_path(&canonical)?;
    ensure_not_reparse_point(&canonical).map_err(|error| error.to_string())?;

    if !is_inside_approved_root(&canonical) {
        return Err("outside approved cleanup roots".to_string());
    }

    Ok(canonical)
}

fn cleanup_targets(item: &CleanupItem, canonical: &Path) -> Result<Vec<PathBuf>, String> {
    if item.item_type != CleanupItemType::Group && !canonical.is_dir() {
        return Ok(vec![canonical.to_path_buf()]);
    }

    let mut targets = Vec::new();
    let entries = fs::read_dir(canonical).map_err(classify_io_error)?;
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = entry.path();
        let metadata = match fs::symlink_metadata(&path) {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        if is_reparse_or_symlink(&metadata) {
            continue;
        }
        let child = match fs::canonicalize(&path) {
            Ok(child) => child,
            Err(_) => continue,
        };
        if reject_dangerous_path(&child).is_err() {
            continue;
        }
        if !is_inside_approved_root(&child) || !child.starts_with(canonical) {
            continue;
        }
        targets.push(child);
    }
    Ok(targets)
}

fn process_cleanup_target(
    item: &CleanupItem,
    target: &Path,
    approved_root: &Path,
    processed_paths: &mut HashSet<PathBuf>,
    result: &mut CleanResult,
) {
    let canonical = match fs::canonicalize(target) {
        Ok(path) => path,
        Err(error) => {
            record_failed_target(item, target, classify_io_error(error), result);
            return;
        }
    };

    if !canonical.starts_with(approved_root) || !is_inside_approved_root(&canonical) {
        result.skipped_count += 1;
        result.skipped_items.push(CleanupOutcomeItem {
            id: item.id.clone(),
            name: item.name.clone(),
            path: clean_path_text(&canonical),
            size_bytes: 0,
            reason: Some("outside approved cleanup root".to_string()),
        });
        return;
    }

    let metadata = match fs::symlink_metadata(&canonical) {
        Ok(metadata) => metadata,
        Err(error) => {
            record_failed_target(item, &canonical, classify_io_error(error), result);
            return;
        }
    };

    if is_reparse_or_symlink(&metadata) {
        result.skipped_count += 1;
        result.skipped_items.push(CleanupOutcomeItem {
            id: item.id.clone(),
            name: item.name.clone(),
            path: clean_path_text(&canonical),
            size_bytes: 0,
            reason: Some("reparse point or symlink skipped".to_string()),
        });
        return;
    }

    if metadata.is_dir() {
        match cleanup_child_targets(item, &canonical, approved_root, processed_paths, result) {
            Ok(_) => try_move_empty_child_folder(
                item,
                &canonical,
                approved_root,
                processed_paths,
                result,
            ),
            Err(error) => record_failed_target(item, &canonical, error, result),
        }
        return;
    }

    if !processed_paths.insert(canonical.clone()) {
        return;
    }

    let size = path_size(&canonical).unwrap_or(0);
    match move_path_to_recycle_bin(&canonical) {
        Ok(()) => {
            result.removed_count += 1;
            result.removed_size_bytes += size;
            result.removed_items.push(CleanupOutcomeItem {
                id: item.id.clone(),
                name: item.name.clone(),
                path: clean_path_text(&canonical),
                size_bytes: size,
                reason: None,
            });
        }
        Err(error) => record_failed_target(item, &canonical, error, result),
    }
}

fn cleanup_child_targets(
    item: &CleanupItem,
    directory: &Path,
    approved_root: &Path,
    processed_paths: &mut HashSet<PathBuf>,
    result: &mut CleanResult,
) -> Result<usize, String> {
    let entries = fs::read_dir(directory).map_err(classify_io_error)?;
    let mut processed_children = 0;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result.warnings.push(format!(
                    "A child entry inside {} could not be read: {}",
                    display_path(directory),
                    classify_io_error(error)
                ));
                continue;
            }
        };
        let path = entry.path();
        process_cleanup_target(item, &path, approved_root, processed_paths, result);
        processed_children += 1;
    }

    Ok(processed_children)
}

fn try_move_empty_child_folder(
    item: &CleanupItem,
    directory: &Path,
    approved_root: &Path,
    processed_paths: &mut HashSet<PathBuf>,
    result: &mut CleanResult,
) {
    if directory == approved_root {
        return;
    }

    let is_empty = match fs::read_dir(directory) {
        Ok(mut entries) => entries.next().is_none(),
        Err(_) => false,
    };

    if !is_empty {
        return;
    }

    if !processed_paths.insert(directory.to_path_buf()) {
        return;
    }

    let size = path_size(directory).unwrap_or(0);
    match move_path_to_recycle_bin(directory) {
        Ok(()) => {
            result.removed_count += 1;
            result.removed_size_bytes += size;
            result.removed_items.push(CleanupOutcomeItem {
                id: item.id.clone(),
                name: item.name.clone(),
                path: clean_path_text(directory),
                size_bytes: size,
                reason: Some("Empty child folder moved after cleanup.".to_string()),
            });
        }
        Err(error) => record_failed_target(item, directory, error, result),
    }
}

fn retry_failed_items(result: &mut CleanResult) {
    if result.failed_items.is_empty() {
        return;
    }

    let original_failed = result.failed_items.clone();
    let mut retry_removed = Vec::new();

    for failed in &original_failed {
        let path = PathBuf::from(&failed.path);
        if !path.exists() {
            continue;
        }

        let canonical = match fs::canonicalize(&path) {
            Ok(path) => path,
            Err(_) => continue,
        };

        if reject_dangerous_path(&canonical).is_err()
            || ensure_not_reparse_point(&canonical).is_err()
            || !is_inside_approved_root(&canonical)
            || is_exact_approved_root(&canonical)
        {
            continue;
        }

        let metadata = match fs::symlink_metadata(&canonical) {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            let is_empty = match fs::read_dir(&canonical) {
                Ok(mut entries) => entries.next().is_none(),
                Err(_) => false,
            };
            if !is_empty {
                continue;
            }
        }

        let size = path_size(&canonical).unwrap_or(failed.size_bytes);
        if move_path_to_recycle_bin(&canonical).is_ok() {
            retry_removed.push(failed.path.clone());
            result.removed_count += 1;
            result.removed_size_bytes += size;
            result.removed_items.push(CleanupOutcomeItem {
                id: failed.id.clone(),
                name: failed.name.clone(),
                path: clean_path_text(&canonical),
                size_bytes: size,
                reason: Some("Moved during retry pass.".to_string()),
            });
        }
    }

    if retry_removed.is_empty() {
        return;
    }

    let retried: HashSet<String> = retry_removed.into_iter().collect();
    result
        .failed_items
        .retain(|item| !retried.contains(&item.path));
    result
        .locked_items
        .retain(|item| !retried.contains(&item.path));
    result
        .permission_denied_items
        .retain(|item| !retried.contains(&item.path));
    result
        .errors
        .retain(|error| !retried.iter().any(|path| error.contains(path)));
    result.failed_count = result.failed_items.len() as u64;
}

fn record_failed_target(
    item: &CleanupItem,
    target: &Path,
    reason: String,
    result: &mut CleanResult,
) {
    let size = path_size(target).unwrap_or(0);
    let path = clean_path_text(target);
    let failure_kind = classify_failure_reason(&reason);
    let failed = CleanupOutcomeItem {
        id: item.id.clone(),
        name: item.name.clone(),
        path: path.clone(),
        size_bytes: size,
        reason: Some(reason.clone()),
    };

    result.failed_count += 1;
    result.errors.push(format!("{} failed: {}", path, reason));
    result.failed_items.push(failed.clone());
    match failure_kind {
        FailureKind::Locked => result.locked_items.push(failed),
        FailureKind::PermissionDenied => result.permission_denied_items.push(failed),
        FailureKind::Other => {}
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FailureKind {
    Locked,
    PermissionDenied,
    Other,
}

fn classify_failure_reason(reason: &str) -> FailureKind {
    let lower = reason.to_ascii_lowercase();
    if lower.contains("permission_denied")
        || lower.contains("access is denied")
        || lower.contains("access denied")
        || lower.contains("requires permission")
    {
        return FailureKind::PermissionDenied;
    }
    if lower.contains("locked")
        || lower.contains("being used")
        || lower.contains("in use")
        || lower.contains("code 32")
        || lower.contains("code 124")
        || lower.contains("recycle bin operation failed")
    {
        return FailureKind::Locked;
    }
    FailureKind::Other
}

fn current_size_for_item(item: &CleanupItem) -> Option<u64> {
    let canonical = validate_selected_item(item).ok()?;
    path_size(&canonical).ok()
}

fn path_size(path: &Path) -> Result<u64, String> {
    let metadata = fs::symlink_metadata(path).map_err(classify_io_error)?;
    if is_reparse_or_symlink(&metadata) {
        return Err("reparse point skipped".to_string());
    }
    if metadata.is_file() {
        return Ok(metadata.len());
    }
    if !metadata.is_dir() {
        return Ok(0);
    }

    let mut size = 0;
    let mut stack = vec![path.to_path_buf()];
    while let Some(current) = stack.pop() {
        for entry in fs::read_dir(current).map_err(classify_io_error)? {
            let entry = entry.map_err(classify_io_error)?;
            let metadata = fs::symlink_metadata(entry.path()).map_err(classify_io_error)?;
            if is_reparse_or_symlink(&metadata) {
                continue;
            }
            if metadata.is_file() {
                size += metadata.len();
            } else if metadata.is_dir() {
                stack.push(entry.path());
            }
        }
    }
    Ok(size)
}

fn reject_dangerous_path(path: &Path) -> Result<(), String> {
    let path_text = path.to_string_lossy().to_ascii_lowercase();

    if path.parent().is_none() {
        return Err("drive root rejected".to_string());
    }

    let dangerous_envs = [
        "USERPROFILE",
        "DESKTOP",
        "DOCUMENTS",
        "DOWNLOADS",
        "PICTURES",
        "VIDEOS",
        "MUSIC",
        "ProgramFiles",
        "ProgramFiles(x86)",
    ];

    for env_name in dangerous_envs {
        if let Ok(value) = env::var(env_name) {
            let dangerous = PathBuf::from(value);
            if let Ok(canonical) = fs::canonicalize(dangerous) {
                if path == canonical || path.starts_with(&canonical) && env_name != "USERPROFILE" {
                    return Err(format!("{} path rejected", env_name));
                }
                if env_name == "USERPROFILE" && path == canonical {
                    return Err("user profile root rejected".to_string());
                }
            }
        }
    }

    if let Ok(user_profile) = env::var("USERPROFILE") {
        let profile = PathBuf::from(user_profile);
        for child in [
            "Desktop",
            "Documents",
            "Downloads",
            "Pictures",
            "Videos",
            "Music",
        ] {
            let dangerous = profile.join(child);
            if let Ok(canonical) = fs::canonicalize(dangerous) {
                if path == canonical || path.starts_with(canonical) {
                    return Err(format!("{} path rejected", child));
                }
            }
        }
    }

    if path_text.contains(r"\windows\system32") {
        return Err("System32 rejected".to_string());
    }
    if path_text.ends_with(r"\windows") {
        return Err("Windows root rejected".to_string());
    }
    if path_text.contains("hkey_") || path_text.starts_with("registry:") {
        return Err("registry paths are not supported".to_string());
    }

    Ok(())
}

fn is_inside_approved_root(path: &Path) -> bool {
    approved_roots()
        .into_iter()
        .filter(|root| !root.protected && root.path.exists())
        .filter_map(|root| fs::canonicalize(root.path).ok())
        .any(|root| path == root || path.starts_with(root))
}

fn is_exact_approved_root(path: &Path) -> bool {
    approved_roots()
        .into_iter()
        .filter(|root| !root.protected && root.path.exists())
        .filter_map(|root| fs::canonicalize(root.path).ok())
        .any(|root| path == root)
}

fn ensure_not_reparse_point(path: &Path) -> io::Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    if is_reparse_or_symlink(&metadata) {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            "reparse point or symlink rejected",
        ));
    }
    Ok(())
}

fn is_reparse_or_symlink(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        metadata.file_attributes() & REPARSE_POINT_ATTRIBUTE != 0
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(windows)]
fn move_path_to_recycle_bin(path: &Path) -> Result<(), String> {
    use std::iter;
    use windows_sys::Win32::UI::Shell::{
        SHFileOperationW, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT, FO_DELETE,
        SHFILEOPSTRUCTW,
    };

    if !path.exists() {
        return Err("missing".to_string());
    }

    let shell_path = shell_operation_path(path);
    let mut from: Vec<u16> = shell_path
        .encode_utf16()
        .chain(iter::once(0))
        .chain(iter::once(0))
        .collect();

    let mut operation = SHFILEOPSTRUCTW {
        hwnd: std::ptr::null_mut(),
        wFunc: FO_DELETE,
        pFrom: from.as_mut_ptr(),
        pTo: std::ptr::null(),
        fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT) as u16,
        fAnyOperationsAborted: 0,
        hNameMappings: std::ptr::null_mut(),
        lpszProgressTitle: std::ptr::null(),
    };

    let code = unsafe { SHFileOperationW(&mut operation) };
    if code != 0 {
        return Err(format!("recycle bin operation failed with code {}", code));
    }
    if operation.fAnyOperationsAborted != 0 {
        return Err("recycle bin operation was aborted".to_string());
    }
    Ok(())
}

#[cfg(windows)]
fn shell_operation_path(path: &Path) -> String {
    clean_path_text(path)
}

#[cfg(not(windows))]
fn move_path_to_recycle_bin(_path: &Path) -> Result<(), String> {
    Err("Recycle Bin cleanup is only supported on Windows.".to_string())
}

fn outcome_item(item: &CleanupItem, reason: Option<String>) -> CleanupOutcomeItem {
    CleanupOutcomeItem {
        id: item.id.clone(),
        name: item.name.clone(),
        path: item.path.clone(),
        size_bytes: item.size_bytes,
        reason,
    }
}

fn stable_id(source: &str, path: &Path) -> String {
    let base = format!("{}-{}", source, path_dedupe_key(path)).to_ascii_lowercase();
    base.chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() {
                char
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

pub(crate) fn display_path(path: &Path) -> String {
    let text = clean_path_text(path);
    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        return text.replace(&clean_path_string(&local_app_data), "%LOCALAPPDATA%");
    }
    if let Ok(temp) = env::var("TEMP") {
        return text.replace(&clean_path_string(&temp), "%TEMP%");
    }
    text
}

fn path_dedupe_key(path: &Path) -> String {
    clean_path_text(path).to_ascii_lowercase()
}

fn clean_path_text(path: &Path) -> String {
    clean_path_string(&path.to_string_lossy())
}

fn clean_path_string(path: &str) -> String {
    if let Some(stripped) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{}", stripped);
    }
    if let Some(stripped) = path.strip_prefix(r"\\?\") {
        return stripped.to_string();
    }
    path.to_string()
}

fn newest_time(current: Option<SystemTime>, next: Option<SystemTime>) -> Option<SystemTime> {
    match (current, next) {
        (Some(a), Some(b)) => Some(if b > a { b } else { a }),
        (None, Some(b)) => Some(b),
        (Some(a), None) => Some(a),
        (None, None) => None,
    }
}

fn system_time_to_string(time: SystemTime) -> Option<String> {
    let duration = time.duration_since(SystemTime::UNIX_EPOCH).ok()?;
    Some(duration.as_secs().to_string())
}

fn classify_io_error(error: io::Error) -> String {
    match error.kind() {
        io::ErrorKind::PermissionDenied => "permission_denied".to_string(),
        io::ErrorKind::NotFound => "missing".to_string(),
        _ => error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn test_item(path: PathBuf) -> CleanupItem {
        CleanupItem {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test item".to_string(),
            category: CleanupCategory::Windows,
            source: "test".to_string(),
            path: path.to_string_lossy().to_string(),
            display_path: path.to_string_lossy().to_string(),
            size_bytes: 0,
            items_count: 1,
            item_type: CleanupItemType::File,
            cleanable: true,
            protected: false,
            selected_by_default: true,
            skip_reason: None,
            warning: None,
            last_modified: None,
        }
    }

    #[test]
    fn dry_run_does_not_delete_temp_file() {
        let root = env::temp_dir().join("CleanStartRustDryRunTest");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let file = root.join("test1.tmp");
        fs::File::create(&file)
            .unwrap()
            .write_all(b"cleanstart")
            .unwrap();

        let result = dry_run_cleanup(vec![test_item(file.clone())]);

        assert!(file.exists());
        assert_eq!(result.cleanable_count, 1);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn allowed_temp_path_is_accepted() {
        let root = env::temp_dir().join("CleanStartRustAllowedPath");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let file = root.join("allowed.tmp");
        fs::write(&file, b"cleanstart").unwrap();

        assert!(validate_selected_item(&test_item(file.clone())).is_ok());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn display_path_strips_windows_verbatim_prefix() {
        let path = PathBuf::from(r"\\?\C:\Users\Public\AppData\Local\Temp");
        let text = display_path(&path);

        assert!(!text.contains(r"\\?\"));
        assert_eq!(text, r"C:\Users\Public\AppData\Local\Temp");
    }

    #[test]
    fn dedupe_key_treats_verbatim_and_normal_windows_paths_as_same() {
        let normal = PathBuf::from(r"C:\Users\Public\AppData\Local\Temp");
        let verbatim = PathBuf::from(r"\\?\C:\Users\Public\AppData\Local\Temp");

        assert_eq!(path_dedupe_key(&normal), path_dedupe_key(&verbatim));
    }

    #[test]
    fn missing_file_is_skipped_safely() {
        let file = env::temp_dir()
            .join("CleanStartRustMissingTest")
            .join("missing.tmp");
        let result = dry_run_cleanup(vec![test_item(file)]);

        assert_eq!(result.skipped_count, 1);
        assert!(result.skipped_items[0]
            .reason
            .as_ref()
            .unwrap()
            .contains("missing"));
    }

    #[test]
    fn folder_cleanup_targets_children_not_selected_folder() {
        let root = env::temp_dir().join("CleanStartRustTargetsChildren");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let child = root.join("child.tmp");
        fs::write(&child, b"cleanstart").unwrap();
        let canonical = fs::canonicalize(&root).unwrap();

        let targets = cleanup_targets(&test_item(root.clone()), &canonical).unwrap();

        assert!(!targets.contains(&canonical));
        assert!(targets.iter().any(|path| path.ends_with("child.tmp")));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn approved_temp_root_targets_children_not_root() {
        let temp_root = env::temp_dir();
        let marker = temp_root.join("CleanStartRustTempRootMarker.tmp");
        fs::write(&marker, b"cleanstart").unwrap();
        let canonical = fs::canonicalize(&temp_root).unwrap();

        let targets = cleanup_targets(&test_item(temp_root.clone()), &canonical).unwrap();

        assert!(!targets.contains(&canonical));
        assert!(targets
            .iter()
            .any(|path| path.ends_with("CleanStartRustTempRootMarker.tmp")));
        let _ = fs::remove_file(marker);
    }

    #[test]
    fn cleanup_refuses_permanent_delete_alpha() {
        let root = env::temp_dir().join("CleanStartRustPermanentDisabled");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let file = root.join("test1.tmp");
        fs::write(&file, b"cleanstart").unwrap();

        let result = clean_selected_items(
            vec![test_item(file.clone())],
            CleanupOptions {
                move_to_recycle_bin: false,
            },
        );

        assert!(file.exists());
        assert_eq!(result.skipped_count, 1);
        assert!(result.warnings[0].contains("Permanent deletion is disabled"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    #[ignore = "manual Recycle Bin smoke test; moves only a generated temp file"]
    fn manual_recycle_bin_cleanup_moves_generated_temp_file() {
        let root = env::temp_dir().join("CleanStartRustRecycleBinTest");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let file = root.join("recycle-bin-smoke.tmp");
        fs::write(&file, b"cleanstart").unwrap();

        let result = clean_selected_items(
            vec![test_item(file.clone())],
            CleanupOptions {
                move_to_recycle_bin: true,
            },
        );

        assert_eq!(result.removed_count, 1, "{result:?}");
        assert_eq!(result.failed_count, 0, "{result:?}");
        assert!(!file.exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    #[ignore = "manual Recycle Bin smoke test; moves generated temp children and keeps the selected folder"]
    fn manual_folder_cleanup_keeps_selected_folder_and_moves_children() {
        let root = env::temp_dir().join("CleanStartManualTest");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested")).unwrap();
        let file = root.join("test1.tmp");
        let nested_file = root.join("nested").join("test2.cache");
        fs::write(&file, b"cleanstart").unwrap();
        fs::write(&nested_file, b"cleanstart").unwrap();

        let result = clean_selected_items(
            vec![test_item(root.clone())],
            CleanupOptions {
                move_to_recycle_bin: true,
            },
        );

        assert!(root.exists());
        assert!(!file.exists());
        assert!(!nested_file.exists());
        assert!(result.removed_count >= 2, "{result:?}");
        assert_eq!(result.failed_count, 0, "{result:?}");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn cleanup_returns_skipped_result_for_user_profile_root() {
        let user_profile = env::var("USERPROFILE").expect("USERPROFILE should exist on Windows");
        let result = clean_selected_items(
            vec![test_item(PathBuf::from(user_profile))],
            CleanupOptions {
                move_to_recycle_bin: true,
            },
        );

        assert_eq!(result.skipped_count, 1);
        assert!(result.removed_items.is_empty());
        assert!(result.warnings[0].contains("rejected"));
    }

    #[test]
    fn desktop_documents_downloads_program_files_and_system32_are_rejected_if_present() {
        let mut checked = 0;
        for env_name in ["USERPROFILE", "ProgramFiles"] {
            if let Ok(value) = env::var(env_name) {
                let path = PathBuf::from(value);
                if path.exists() {
                    let canonical = fs::canonicalize(path).unwrap();
                    assert!(reject_dangerous_path(&canonical).is_err());
                    checked += 1;
                }
            }
        }

        if let Ok(user_profile) = env::var("USERPROFILE") {
            for child in ["Desktop", "Documents", "Downloads"] {
                let path = PathBuf::from(&user_profile).join(child);
                if path.exists() {
                    let canonical = fs::canonicalize(path).unwrap();
                    assert!(reject_dangerous_path(&canonical).is_err());
                    checked += 1;
                }
            }
        }

        let system32 = PathBuf::from(r"C:\Windows\System32");
        if system32.exists() {
            let canonical = fs::canonicalize(system32).unwrap();
            assert!(reject_dangerous_path(&canonical).is_err());
            checked += 1;
        }

        assert!(checked > 0);
    }
}
