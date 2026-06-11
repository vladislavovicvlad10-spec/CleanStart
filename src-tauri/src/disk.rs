//! Disk Analyzer backend.
//!
//! Strictly read-only: this module walks user-profile folders, sums sizes and
//! reports the largest files. It contains no deletion code at all and never
//! follows symlinks or reparse points.

use crate::error::AppResult;
use crate::util::{friendly_path, home_dir};
use serde::Serialize;
use std::{
    cmp::Reverse,
    collections::BinaryHeap,
    fs,
    path::{Path, PathBuf},
    time::{Duration, Instant, UNIX_EPOCH},
};

const MAX_DEPTH: usize = 12;
const MAX_FILES_TOTAL: u64 = 400_000;
const TIME_BUDGET: Duration = Duration::from_secs(25);
const TOP_FILES: usize = 40;
const REPARSE_POINT_ATTRIBUTE: u32 = 0x400;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderUsage {
    pub name: String,
    pub display_path: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub skipped_count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargeFile {
    pub name: String,
    pub display_path: String,
    pub size_bytes: u64,
    pub modified_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveStats {
    pub total_bytes: u64,
    pub free_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskScanResult {
    pub folders: Vec<FolderUsage>,
    pub largest_files: Vec<LargeFile>,
    pub total_bytes: u64,
    pub scanned_files: u64,
    pub duration_ms: u64,
    pub truncated: bool,
    pub warnings: Vec<String>,
    pub drive: Option<DriveStats>,
}

#[tauri::command]
pub fn scan_disk_usage() -> AppResult<DiskScanResult> {
    let start = Instant::now();
    let mut result = DiskScanResult::default();

    let Some(home) = home_dir() else {
        result
            .warnings
            .push("The user profile folder could not be located.".to_string());
        return Ok(result);
    };

    result.drive = drive_stats(&home);

    let mut heap: BinaryHeap<Reverse<(u64, String, Option<u64>, String)>> = BinaryHeap::new();
    let mut total_files: u64 = 0;

    for (label, path) in scan_roots(&home) {
        if !path.is_dir() {
            continue;
        }

        if start.elapsed() > TIME_BUDGET {
            result.truncated = true;
            result.warnings.push(format!(
                "Scan time limit reached before {label} could be analyzed."
            ));
            continue;
        }

        let usage = scan_folder(
            &label,
            &path,
            &start,
            &mut total_files,
            &mut heap,
            &mut result,
        );
        result.total_bytes += usage.size_bytes;
        result.scanned_files += usage.file_count;
        result.folders.push(usage);
    }

    result
        .folders
        .sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    let mut largest: Vec<LargeFile> = heap
        .into_sorted_vec()
        .into_iter()
        .map(|Reverse((size, display_path, modified, name))| LargeFile {
            name,
            display_path,
            size_bytes: size,
            modified_ms: modified,
        })
        .collect();
    largest.reverse();
    result.largest_files = largest;

    result.duration_ms = start.elapsed().as_millis() as u64;
    Ok(result)
}

fn scan_roots(home: &Path) -> Vec<(String, PathBuf)> {
    vec![
        ("Desktop".to_string(), home.join("Desktop")),
        ("Documents".to_string(), home.join("Documents")),
        ("Downloads".to_string(), home.join("Downloads")),
        ("Pictures".to_string(), home.join("Pictures")),
        ("Videos".to_string(), home.join("Videos")),
        ("Music".to_string(), home.join("Music")),
        (
            "Local AppData".to_string(),
            home.join("AppData").join("Local"),
        ),
        (
            "Roaming AppData".to_string(),
            home.join("AppData").join("Roaming"),
        ),
    ]
}

fn scan_folder(
    label: &str,
    root: &Path,
    start: &Instant,
    total_files: &mut u64,
    heap: &mut BinaryHeap<Reverse<(u64, String, Option<u64>, String)>>,
    result: &mut DiskScanResult,
) -> FolderUsage {
    let mut usage = FolderUsage {
        name: label.to_string(),
        display_path: friendly_path(root),
        size_bytes: 0,
        file_count: 0,
        skipped_count: 0,
    };

    let mut stack = vec![(root.to_path_buf(), 0usize)];

    while let Some((current, depth)) = stack.pop() {
        if start.elapsed() > TIME_BUDGET || *total_files >= MAX_FILES_TOTAL {
            if !result.truncated {
                result.truncated = true;
                result.warnings.push(
                    "Scan limits reached. Results are a partial but safe snapshot.".to_string(),
                );
            }
            break;
        }
        if depth > MAX_DEPTH {
            usage.skipped_count += 1;
            continue;
        }

        let entries = match fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(_) => {
                usage.skipped_count += 1;
                continue;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(_) => {
                    usage.skipped_count += 1;
                    continue;
                }
            };

            if is_reparse_or_symlink(&metadata) {
                usage.skipped_count += 1;
                continue;
            }

            if metadata.is_file() {
                let size = metadata.len();
                usage.size_bytes += size;
                usage.file_count += 1;
                *total_files += 1;
                push_large_file(heap, &path, size, &metadata);
            } else if metadata.is_dir() {
                stack.push((path, depth + 1));
            }
        }
    }

    usage
}

fn push_large_file(
    heap: &mut BinaryHeap<Reverse<(u64, String, Option<u64>, String)>>,
    path: &Path,
    size: u64,
    metadata: &fs::Metadata,
) {
    if size == 0 {
        return;
    }
    let smallest_tracked = heap.peek().map(|Reverse((s, ..))| *s).unwrap_or(0);
    if heap.len() >= TOP_FILES && size <= smallest_tracked {
        return;
    }

    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64);
    let name = path
        .file_name()
        .map(|file_name| file_name.to_string_lossy().to_string())
        .unwrap_or_default();

    heap.push(Reverse((size, friendly_path(path), modified, name)));
    while heap.len() > TOP_FILES {
        heap.pop();
    }
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
        let _ = REPARSE_POINT_ATTRIBUTE;
        false
    }
}

#[cfg(windows)]
fn drive_stats(path: &Path) -> Option<DriveStats> {
    use std::iter;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect();
    let mut free_to_caller: u64 = 0;
    let mut total: u64 = 0;
    let mut total_free: u64 = 0;
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_to_caller,
            &mut total,
            &mut total_free,
        )
    };
    (ok != 0).then_some(DriveStats {
        total_bytes: total,
        free_bytes: total_free,
    })
}

#[cfg(not(windows))]
fn drive_stats(_path: &Path) -> Option<DriveStats> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn scan_is_read_only_and_reports_sizes() {
        let root = std::env::temp_dir().join("CleanStartDiskScanTest");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested")).unwrap();
        let file = root.join("nested").join("big.bin");
        fs::File::create(&file)
            .unwrap()
            .write_all(&[0u8; 4096])
            .unwrap();

        let start = Instant::now();
        let mut heap = BinaryHeap::new();
        let mut total_files = 0u64;
        let mut result = DiskScanResult::default();
        let usage = scan_folder(
            "Test",
            &root,
            &start,
            &mut total_files,
            &mut heap,
            &mut result,
        );

        assert!(file.exists(), "scan must never modify files");
        assert_eq!(usage.file_count, 1);
        assert_eq!(usage.size_bytes, 4096);
        assert_eq!(heap.len(), 1);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn large_file_heap_keeps_only_top_entries() {
        let root = std::env::temp_dir().join("CleanStartDiskHeapTest");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let mut heap = BinaryHeap::new();
        for index in 0..(TOP_FILES + 10) {
            let path = root.join(format!("file-{index}.bin"));
            fs::write(&path, vec![0u8; index + 1]).unwrap();
            let metadata = fs::symlink_metadata(&path).unwrap();
            push_large_file(&mut heap, &path, (index + 1) as u64, &metadata);
        }

        assert_eq!(heap.len(), TOP_FILES);
        let smallest = heap.peek().map(|Reverse((size, ..))| *size).unwrap();
        assert!(smallest > 10, "smallest tracked file should be one of the largest");
        let _ = fs::remove_dir_all(&root);
    }
}
