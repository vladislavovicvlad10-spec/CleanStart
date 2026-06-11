mod cleanup;
mod disk;
mod error;
mod history;
mod settings;
mod startup;
mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Temp Cleaner — preview-first, Recycle Bin only
            cleanup::scan_temp_preview,
            cleanup::dry_run_cleanup,
            cleanup::clean_selected_items,
            // Startup Analyzer — reversible enable/disable, never deletes
            startup::scan_startup_entries,
            startup::set_startup_entry_enabled,
            // Disk Analyzer — strictly read-only
            disk::scan_disk_usage,
            // Activity history — local JSON only, no telemetry
            history::log_activity,
            history::get_activity_log,
            history::clear_activity_log,
            // Settings
            settings::get_app_settings,
            settings::save_app_settings,
            settings::set_launch_at_startup,
            settings::get_approved_cleanup_locations
        ])
        .run(tauri::generate_context!())
        .expect("failed to run CleanStart");
}
