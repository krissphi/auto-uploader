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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AutomationState {
            process: Mutex::new(None),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_automation, stop_automation])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
