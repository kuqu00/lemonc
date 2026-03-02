// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, CustomMenuItem, State, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use tauri_plugin_window_state::{StateFlags, WindowExt};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

// 自动备份状态
static AUTO_BACKUP_ENABLED: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));

#[derive(Serialize, Deserialize, Debug, Clone)]
struct BackupInfo {
    timestamp: String,
    path: String,
    size: u64,
    #[serde(rename = "backupType")]
    backup_type: String,
}

// 获取应用数据目录
fn get_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("Failed to get app data dir")
}

// 获取备份目录
fn get_backup_dir(app: &AppHandle) -> PathBuf {
    let backup_dir = get_data_dir(app).join("backups");
    fs::create_dir_all(&backup_dir).ok();
    backup_dir
}

// 写入文件
#[tauri::command]
fn write_data_file(app: AppHandle, filename: String, content: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app);
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    
    let file_path = data_dir.join(&filename);
    let mut file = File::create(file_path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 读取文件
#[tauri::command]
fn read_data_file(app: AppHandle, filename: String) -> Result<String, String> {
    let file_path = get_data_dir(&app).join(&filename);
    
    if !file_path.exists() {
        return Ok("{}".to_string());
    }
    
    let mut file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    
    Ok(content)
}

// 列出所有数据文件
#[tauri::command]
fn list_data_files(app: AppHandle) -> Result<Vec<String>, String> {
    let data_dir = get_data_dir(&app);
    
    if !data_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut files = vec![];
    for entry in fs::read_dir(&data_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().map(|e| e == "json").unwrap_or(false) {
            files.push(path.file_name().unwrap().to_string_lossy().to_string());
        }
    }
    
    Ok(files)
}

// 全量备份
#[tauri::command]
fn create_full_backup(app: AppHandle) -> Result<BackupInfo, String> {
    let data_dir = get_data_dir(&app);
    let backup_dir = get_backup_dir(&app);
    
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_name = format!("backup_full_{}.zip", timestamp);
    let backup_path = backup_dir.join(&backup_name);
    
    // 创建 zip 文件
    let file = File::create(&backup_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    
    // 遍历数据目录并添加到 zip
    for entry in WalkDir::new(&data_dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map(|e| e == "json").unwrap_or(false) {
            let relative_path = path.strip_prefix(&data_dir).map_err(|e| e.to_string())?;
            zip.start_file(relative_path.to_string_lossy(), options).map_err(|e| e.to_string())?;
            
            let mut file_content = Vec::new();
            File::open(path).map_err(|e| e.to_string())?.read_to_end(&mut file_content).map_err(|e| e.to_string())?;
            zip.write_all(&file_content).map_err(|e| e.to_string())?;
        }
    }
    
    zip.finish().map_err(|e| e.to_string())?;
    
    let size = fs::metadata(&backup_path).map_err(|e| e.to_string())?.len();
    
    Ok(BackupInfo {
        timestamp: Local::now().to_rfc3339(),
        path: backup_path.to_string_lossy().to_string(),
        size,
        backup_type: "full".to_string(),
    })
}

// 增量备份（只备份有变化的文件）
#[tauri::command]
fn create_incremental_backup(app: AppHandle, last_backup_time: String) -> Result<BackupInfo, String> {
    let data_dir = get_data_dir(&app);
    let backup_dir = get_backup_dir(&app);
    
    let last_backup: DateTime<Local> = DateTime::parse_from_rfc3339(&last_backup_time)
        .map_err(|e| e.to_string())?
        .into();
    
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_name = format!("backup_incremental_{}.zip", timestamp);
    let backup_path = backup_dir.join(&backup_name);
    
    let file = File::create(&backup_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    
    let mut has_new_files = false;
    
    for entry in WalkDir::new(&data_dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map(|e| e == "json").unwrap_or(false) {
            let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
            let modified: DateTime<Local> = metadata.modified().map_err(|e| e.to_string())?.into();
            
            // 只备份修改时间晚于上次备份的文件
            if modified > last_backup {
                has_new_files = true;
                let relative_path = path.strip_prefix(&data_dir).map_err(|e| e.to_string())?;
                zip.start_file(relative_path.to_string_lossy(), options).map_err(|e| e.to_string())?;
                
                let mut file_content = Vec::new();
                File::open(path).map_err(|e| e.to_string())?.read_to_end(&mut file_content).map_err(|e| e.to_string())?;
                zip.write_all(&file_content).map_err(|e| e.to_string())?;
            }
        }
    }
    
    zip.finish().map_err(|e| e.to_string())?;
    
    if !has_new_files {
        fs::remove_file(&backup_path).ok();
        return Err("没有需要备份的新数据".to_string());
    }
    
    let size = fs::metadata(&backup_path).map_err(|e| e.to_string())?.len();
    
    Ok(BackupInfo {
        timestamp: Local::now().to_rfc3339(),
        path: backup_path.to_string_lossy().to_string(),
        size,
        backup_type: "incremental".to_string(),
    })
}

// 列出所有备份
#[tauri::command]
fn list_backups(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir(&app);
    
    if !backup_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut backups = vec![];
    
    for entry in fs::read_dir(&backup_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map(|e| e == "zip").unwrap_or(false) {
            let filename = path.file_stem().unwrap().to_string_lossy().to_string();
            let size = entry.metadata().map_err(|e| e.to_string())?.len();
            let modified: DateTime<Local> = entry.metadata().map_err(|e| e.to_string())?.modified().map_err(|e| e.to_string())?.into();
            
            let backup_type = if filename.contains("full") {
                "full"
            } else if filename.contains("incremental") {
                "incremental"
            } else {
                "unknown"
            };
            
            backups.push(BackupInfo {
                timestamp: modified.to_rfc3339(),
                path: path.to_string_lossy().to_string(),
                size,
                backup_type: backup_type.to_string(),
            });
        }
    }
    
    // 按时间排序
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(backups)
}

// 恢复备份
#[tauri::command]
fn restore_backup(app: AppHandle, backup_path: String) -> Result<(), String> {
    use zip::read::ZipArchive;
    
    let data_dir = get_data_dir(&app);
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    
    let file = File::open(&backup_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = data_dir.join(file.name());
        
        if let Some(parent) = outpath.parent() {
            fs::create_dir_all(parent).ok();
        }
        
        let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
        std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// 删除备份
#[tauri::command]
fn delete_backup(backup_path: String) -> Result<(), String> {
    fs::remove_file(&backup_path).map_err(|e| e.to_string())?;
    Ok(())
}

// 获取数据目录路径（用于前端显示）
#[tauri::command]
fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    Ok(data_dir.to_string_lossy().to_string())
}

// 启动自动备份
#[tauri::command]
async fn start_auto_backup(app: AppHandle, interval_minutes: u64) -> Result<String, String> {
    AUTO_BACKUP_ENABLED.store(true, Ordering::SeqCst);
    let enabled = Arc::clone(&AUTO_BACKUP_ENABLED);

    tokio::spawn(async move {
        let mut timer = tokio::time::interval(tokio::time::Duration::from_secs(interval_minutes * 60));

        loop {
            timer.tick().await;

            if !enabled.load(Ordering::SeqCst) {
                break;
            }

            match create_full_backup(app.clone()) {
                Ok(backup) => {
                    println!("Auto backup created: {}", backup.path);
                }
                Err(e) => {
                    eprintln!("Auto backup failed: {}", e);
                }
            }
        }
    });

    Ok(format!("自动备份已启动，间隔 {} 分钟", interval_minutes))
}

// 停止自动备份
#[tauri::command]
fn stop_auto_backup() -> Result<String, String> {
    AUTO_BACKUP_ENABLED.store(false, Ordering::SeqCst);
    Ok("自动备份已停止".to_string())
}

fn main() {
    // 创建系统托盘
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "显示窗口"))
        .add_item(CustomMenuItem::new("hide", "隐藏窗口"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "退出"));

    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .system_tray(tray)
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // 阻止窗口关闭,改为隐藏到托盘
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_webview_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let window = app.get_webview_window("main").unwrap();
                match id.as_str() {
                    "show" => {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "hide" => {
                        window.hide().unwrap();
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .setup(|app| {
            // 初始化数据库
            let data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let data_dir_str = data_dir.to_string_lossy().to_string();

            // 创建 Tokio runtime
            let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
            rt.block_on(async {
                database::init_database(&data_dir_str).expect("Failed to initialize database");
            });

            // 设置窗口状态
            let window = app.get_webview_window("main").unwrap();
            window.with_state(|state| {
                state.load_flags(StateFlags::all());
            }).ok();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            write_data_file,
            read_data_file,
            list_data_files,
            create_full_backup,
            create_incremental_backup,
            list_backups,
            restore_backup,
            delete_backup,
            get_data_directory,
            database::export_all_data,
            database::import_all_data,
            database::get_db_stats,
            start_auto_backup,
            stop_auto_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
