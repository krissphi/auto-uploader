use tauri::{AppHandle, Emitter, Manager, State};
use std::process::{Command, Stdio, Child};
use std::sync::Mutex;
use std::io::{BufRead, BufReader};
use std::thread;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct AutomationState {
    process: Mutex<Option<Child>>,
}

struct BrollState {
    process: Mutex<Option<Child>>,
}

/// Resolve automation script path.
/// In release builds, scripts are bundled into resource_dir/automation/.
/// In dev builds, falls back to cwd-relative paths.
fn resolve_script(app: &AppHandle, script_name: &str) -> std::path::PathBuf {
    // Production: look for automation/ next to the .exe
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let prod_path = exe_dir.join("automation").join(script_name);
            if prod_path.exists() {
                return prod_path;
            }
        }
    }
    // Also check resource_dir (future-proof if bundled later)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let res_path = resource_dir.join("automation").join(script_name);
        if res_path.exists() {
            return res_path;
        }
    }
    // Dev mode fallbacks
    let cwd = std::env::current_dir().unwrap();
    let dev = cwd.join("automation").join(script_name);
    if dev.exists() { return dev; }
    cwd.join("src-tauri").join("automation").join(script_name)
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

/// Check whether playwright-core is installed in the automation directory
#[tauri::command]
fn check_automation_setup(app: AppHandle) -> bool {
    let script = resolve_script(&app, "index.js");
    let automation_dir = match script.parent() {
        Some(p) => p.to_path_buf(),
        None => return false,
    };
    automation_dir.join("node_modules").join("playwright-core").exists()
}

/// Run `pnpm install` inside the automation directory to set up dependencies
#[tauri::command]
fn setup_automation(app: AppHandle) -> Result<(), String> {
    let script = resolve_script(&app, "index.js");
    let automation_dir = script
        .parent()
        .ok_or_else(|| "Cannot resolve automation directory".to_string())?
        .to_path_buf();

    if !automation_dir.exists() {
        return Err(format!("Automation directory not found: {}", automation_dir.display()));
    }

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", "pnpm install"])
         .current_dir(&automation_dir)
         .stdout(Stdio::piped())
         .stderr(Stdio::piped())
         .creation_flags(0x08000000);
        c
    };
    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = Command::new("pnpm");
        c.arg("install")
         .current_dir(&automation_dir)
         .stdout(Stdio::piped())
         .stderr(Stdio::piped());
        c
    };

    let mut child = cmd.spawn().map_err(|e| format!("Failed to run pnpm. Is pnpm installed? Error: {}", e))?;
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line { let _ = app_clone.emit("log", line); }
        }
        let _ = app_clone.emit("log", "[Setup] Automation dependencies installed successfully!");
        let _ = app_clone.emit("setup_finished", ());
    });

    let app_clone = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line { let _ = app_clone.emit("log_error", line); }
        }
    });

    Ok(())
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
    
    let script_path = resolve_script(&app, "index.js");

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
    
    let script_path = resolve_script(&app, "clipper.js");

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

#[tauri::command]
fn download_broll(app: AppHandle, count: i32, yt_dlp_path: String, output_dir: String, state: State<'_, BrollState>) -> Result<(), String> {
    // Resolve output dir: jika relative, gunakan parent dari cwd (project root, bukan src-tauri)
    let base_dir = if std::path::Path::new(&output_dir).is_absolute() {
        std::path::PathBuf::from(&output_dir)
    } else {
        let cwd = std::env::current_dir().unwrap();
        // Kalau running dari src-tauri, naik satu level ke project root
        let root = if cwd.ends_with("src-tauri") { cwd.parent().unwrap().to_path_buf() } else { cwd };
        root.join(&output_dir)
    };
    let output_dir_path = base_dir.join("broll");
    std::fs::create_dir_all(&output_dir_path).unwrap_or_default();
    
    // Stok keyword rahasia bebas hak cipta (20+ Variasi)
    let keywords = [
        "Minecraft parkour gameplay satisfying no copyright",
        "GTA V Mega ramp jump no copyright gameplay",
        "Kinetic sand cutting ASMR oddly satisfying no music",
        "Soap cutting ASMR no talking satisfying",
        "Satisfying slime ASMR no talking no copyright",
        "Subway Surfers gameplay no copyright background video",
        "Super satisfying woodwork ASMR no copyright",
        "Relaxing sand drops oddly satisfying ASMR",
        "Oddly satisfying glass breaking ASMR no music",
        "Smooth soap carving oddly satisfying no copyright",
        "Satisfying kinetic sand crushing ASMR",
        "Minecraft bedwars gameplay no commentary background",
        "Relaxing paint mixing ASMR no copyright",
        "Satisfying floral foam crushing ASMR no music",
        "Oddly satisfying ASMR tape peeling no talking",
        "Relaxing 3D satisfying loops no copyright",
        "Satisfying stress ball cutting ASMR",
        "Oddly satisfying pressure washer ASMR no music",
        "Satisfying domino falling ASMR no copyright",
        "CSGO surfing gameplay background video no commentary",
        "Satisfying cake decorating ASMR no music",
        "Oddly satisfying ice crunching ASMR no talking",
        "Relaxing ASMR calligraphy no copyright"
    ];
    
    // Pilih keyword random berdasar probabilitas pseudo-acak pakai timestamp
    let rand_idx = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as usize % keywords.len();
    let keyword = keywords[rand_idx];
    // Pool 5x dari jumlah yang diminta agar ada cukup kandidat yang lolos filter durasi
    let pool_size = std::cmp::min(count * 5, 25);
    let search_query = format!("ytsearch{}:{}", pool_size, keyword);

    let ytdlp_exe = if yt_dlp_path.trim().is_empty() { "yt-dlp".to_string() } else { yt_dlp_path };
    let mut cmd = Command::new(&ytdlp_exe);
    
    // Durasi tidak dibatasi, tapi kita paksa potong menit 1-11 saja (10 menit)
    // Ini jauh lebih efisien: video berjam-jam pun hanya didownload 10 menitnya
    cmd.arg("-f").arg("bestvideo")
       .arg("-S").arg("height:720,+size") // Prefer 720p, fallback ke resolusi terdekat
       .arg("--download-sections").arg("*60-660") // Menit 1 (60 detik) sampai Menit 11 (660 detik)
       .arg("--force-keyframes-at-cuts")
       .arg("--merge-output-format").arg("mp4")
       .arg("--no-warnings")
       .arg("--no-update")
       .arg("--max-downloads").arg(count.to_string())
       .arg("-o").arg(output_dir_path.join("%(title)s_%(id)s.%(ext)s").to_str().unwrap())
       .arg(&search_query)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn yt-dlp: {}", e.to_string()))?;

    // Simpan proses agar bisa di-stop kapan saja via stop_broll_download
    {
        let mut guard = state.process.lock().unwrap();
        *guard = None; // Hapus proses lama dulu kalau ada
    }

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // Simpan child ke state setelah take stdout/stderr
    {
        let mut guard = state.process.lock().unwrap();
        *guard = Some(child);
    }

    let app_clone = app.clone();
    
    // Log thread Stdout
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                // Jangan log progres bar kasar bawaan yt-dlp jika dirasa terlalu berisik, 
                // tapi kita tampilkan agar user tahu downlod berjalan
                let _ = app_clone.emit("log", line);
            }
        }
        let _ = app_clone.emit("log", "[B-Roll] Massive scraper download finished successfully.");
        let _ = app_clone.emit("broll_download_finished", ());
    });
    
    let app_clone = app.clone();
    // Log thread Stderr - hanya tampilkan ERROR dan WARNING, bukan verbose FFmpeg metadata
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let upper = line.to_uppercase();
                if upper.contains("ERROR") || upper.contains("WARNING") || upper.contains("[DOWNLOAD]") {
                    let _ = app_clone.emit("log_error", format!("[yt-dlp] {}", line));
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_broll_download(state: State<'_, BrollState>) -> Result<(), String> {
    let mut guard = state.process.lock().unwrap();
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        Ok(())
    } else {
        Err("No B-Roll download is running".to_string())
    }
}

#[tauri::command]
fn get_brolls_list(output_dir: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    // Resolve path sama seperti download_broll
    let base_dir = if std::path::Path::new(&output_dir).is_absolute() {
        std::path::PathBuf::from(&output_dir)
    } else {
        let cwd = std::env::current_dir().unwrap();
        let root = if cwd.ends_with("src-tauri") { cwd.parent().unwrap().to_path_buf() } else { cwd };
        root.join(&output_dir)
    };
    let dir = base_dir.join("broll");
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.ends_with(".mp4") || name.ends_with(".webm") {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AutomationState {
            process: Mutex::new(None),
        })
        .manage(BrollState {
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
            check_automation_setup,
            setup_automation,
            get_directory_files,
            get_directories,
            move_file,
            create_dir_all,
            remove_dir_all,
            download_broll,
            stop_broll_download,
            get_brolls_list
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
