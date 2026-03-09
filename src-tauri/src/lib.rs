use tauri::{AppHandle, Emitter, State};
use std::process::{Command, Stdio, Child};
use std::sync::Mutex;
use std::io::{BufRead, BufReader};
use std::thread;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct AutomationState {
    process: Mutex<Option<Child>>,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct VideoItem {
    path: String,
    title: String,
    tags: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct StartConfig {
    browser: String,
    videos: Vec<VideoItem>,
    platforms: Vec<String>,
    times: Vec<String>,
    date: String,
}

#[tauri::command]
fn start_automation(app: AppHandle, config: StartConfig, state: State<'_, AutomationState>) -> Result<(), String> {
    let mut process_guard = state.process.lock().unwrap();
    
    // Check if the process ran and finished gracefully, clean it up
    if let Some(mut child) = process_guard.take() {
        if let Ok(None) = child.try_wait() {
            *process_guard = Some(child);
            return Err("Automation is already running!".to_string());
        }
    }

    let config_json = serde_json::to_string(&config).map_err(|e| e.to_string())?;

    let mut cmd = Command::new("node");
    
    let mut script_path = std::env::current_dir().unwrap().join("automation/index.js");
    if !script_path.exists() {
        script_path = std::env::current_dir().unwrap().join("src-tauri/automation/index.js");
    }

    cmd.arg(script_path.to_str().unwrap())
       .arg(&config_json)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW so Node console doesn't pop up

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn node. Is node installed? Error: {}", e.to_string()))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("log", line);
            }
        }
        let _ = app_clone.emit("log", "Automation Process Finished.");
        let _ = app_clone.emit("automation_finished", ());
    });

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("log_error", line);
            }
        }
    });

    *process_guard = Some(child);

    Ok(())
}

#[tauri::command]
fn stop_automation(state: State<'_, AutomationState>) -> Result<(), String> {
    let mut process_guard = state.process.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        Ok(())
    } else {
        Err("Automation is not running".to_string())
    }
}

#[tauri::command]
fn check_running(state: State<'_, AutomationState>) -> bool {
    let mut process_guard = state.process.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        if let Ok(None) = child.try_wait() {
            *process_guard = Some(child);
            return true;
        }
    }
    false
}

#[tauri::command]
fn check_dependencies() -> Result<Vec<String>, String> {
    let mut missing = Vec::new();

    #[cfg(target_os = "windows")]
    let node_check = Command::new("cmd").args(["/C", "node -v"]).creation_flags(0x08000000).output();
    #[cfg(not(target_os = "windows"))]
    let node_check = Command::new("node").arg("-v").output();

    if node_check.is_err() || !node_check.unwrap().status.success() {
        missing.push("Node.js (https://nodejs.org/)".to_string());
    }

    #[cfg(target_os = "windows")]
    let ffmpeg_check = Command::new("cmd").args(["/C", "ffmpeg -version"]).creation_flags(0x08000000).output();
    #[cfg(not(target_os = "windows"))]
    let ffmpeg_check = Command::new("ffmpeg").arg("-version").output();

    if ffmpeg_check.is_err() || !ffmpeg_check.unwrap().status.success() {
        missing.push("FFmpeg (https://ffmpeg.org/download.html)".to_string());
    }

    Ok(missing)
}

#[tauri::command]
fn start_clipper(app: AppHandle, config: String, state: State<'_, AutomationState>) -> Result<(), String> {
    let mut process_guard = state.process.lock().unwrap();
    
    // Check if the process ran and finished gracefully, clean it up
    if let Some(mut child) = process_guard.take() {
        if let Ok(None) = child.try_wait() {
            *process_guard = Some(child);
            return Err("A process is already running!".to_string());
        }
    }

    let mut cmd = Command::new("node");
    
    let mut script_path = std::env::current_dir().unwrap().join("automation/clipper.js");
    if !script_path.exists() {
        script_path = std::env::current_dir().unwrap().join("src-tauri/automation/clipper.js");
    }

    cmd.arg(script_path.to_str().unwrap())
       .arg(&config)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn node. Error: {}", e.to_string()))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("log", line);
            }
        }
        let _ = app_clone.emit("log", "Clipper Process Finished.");
        let _ = app_clone.emit("clipper_finished", ());
    });

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("log_error", line);
            }
        }
    });

    *process_guard = Some(child);

    Ok(())
}

#[tauri::command]
fn get_directory_files(path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.ends_with(".mp4") {
                                files.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn get_directories(path: String) -> Result<Vec<String>, String> {
    let mut dirs = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        if let Some(name) = entry.file_name().to_str() {
                            dirs.push(name.to_string());
                        }
                    }
                }
            }
        }
    }
    Ok(dirs)
}

#[tauri::command]
fn move_file(source: String, dest: String) -> Result<(), String> {
    std::fs::rename(source, dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_dir_all(path: String) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_dir_all(path: String) -> Result<(), String> {
    std::fs::remove_dir_all(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AutomationState {
            process: Mutex::new(None),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_automation, 
            stop_automation, 
            check_running,
            start_clipper,
            check_dependencies,
            get_directory_files,
            get_directories,
            move_file,
            create_dir_all,
            remove_dir_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
