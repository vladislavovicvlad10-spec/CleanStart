mod cleanup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            cleanup::scan_temp_preview,
            cleanup::dry_run_cleanup,
            cleanup::clean_selected_items,
            cleanup::get_cleanup_settings,
            cleanup::save_cleanup_settings
        ])
        .run(tauri::generate_context!())
        .expect("failed to run CleanStart");
}
