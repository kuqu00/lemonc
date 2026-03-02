// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

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
    app.path_resolver()
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
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;
    use walkdir::WalkDir;
    
    let data_dir = get_data_dir(&app);
    let backup_dir = get_backup_dir(&app);
    
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_name = format!("backup_full_{}.zip", timestamp);
    let backup_path = backup_dir.join(&backup_name);
    
    let file = File::create(&backup_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    
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
            let modified = entry.metadata().map_err(|e| e.to_string())?.modified().map_err(|e| e.to_string())?;
            let modified_datetime: chrono::DateTime<Local> = modified.into();
            
            let backup_type = if filename.contains("full") {
                "full"
            } else if filename.contains("incremental") {
                "incremental"
            } else {
                "unknown"
            };
            
            backups.push(BackupInfo {
                timestamp: modified_datetime.to_rfc3339(),
                path: path.to_string_lossy().to_string(),
                size,
                backup_type: backup_type.to_string(),
            });
        }
    }
    
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

// 获取数据目录路径
#[tauri::command]
fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    Ok(data_dir.to_string_lossy().to_string())
}

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "显示窗口"))
        .add_item(CustomMenuItem::new("hide", "隐藏窗口"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "退出"));

    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(tray)
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let window = app.get_window("main").unwrap();
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
        .invoke_handler(tauri::generate_handler![
            write_data_file,
            read_data_file,
            list_data_files,
            create_full_backup,
            list_backups,
            restore_backup,
            delete_backup,
            get_data_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
