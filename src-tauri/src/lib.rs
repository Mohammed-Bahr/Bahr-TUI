use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Serialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[derive(Serialize)]
struct GitFile {
    path: String,
    x: char,
    y: char,
}

#[tauri::command]
fn home_dir() -> Result<String, String> {
    std::env::var("HOME").map_err(|_| "HOME not set".to_string())
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let rd = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    for e in rd.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        entries.push(DirEntry {
            name,
            path: e.path().to_string_lossy().to_string(),
            is_dir,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn run_git(cwd: &str, args: &[&str]) -> Result<String, String> {
    let out = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    if !out.status.success() {
        let msg = if stderr.trim().is_empty() {
            stdout.trim()
        } else {
            stderr.trim()
        };
        return Err(if msg.is_empty() {
            format!("git {} failed", args.join(" "))
        } else {
            msg.to_string()
        });
    }
    Ok(format!("{}{}", stdout, stderr))
}

#[tauri::command]
fn git_is_repo(cwd: String) -> bool {
    Path::new(&cwd).join(".git").exists()
}

#[tauri::command]
fn git_init(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["init"])
}

#[tauri::command]
fn git_branch(cwd: String) -> Result<String, String> {
    Ok(run_git(&cwd, &["rev-parse", "--abbrev-ref", "HEAD"])?.trim().to_string())
}

#[tauri::command]
fn git_status(cwd: String) -> Result<Vec<GitFile>, String> {
    let out = run_git(&cwd, &["status", "--porcelain"])?;
    let mut files = Vec::new();
    for line in out.lines() {
        if line.len() < 4 {
            continue;
        }
        let x = line.as_bytes()[0] as char;
        let y = line.as_bytes()[1] as char;
        let mut path = line[3..].to_string();
        if let Some((_, new)) = path.split_once(" -> ") {
            path = new.to_string();
        }
        files.push(GitFile { path, x, y });
    }
    Ok(files)
}

#[tauri::command]
fn git_stage(cwd: String, file: String) -> Result<String, String> {
    run_git(&cwd, &["add", "--", &file])
}

#[tauri::command]
fn git_unstage(cwd: String, file: String) -> Result<String, String> {
    run_git(&cwd, &["reset", "HEAD", "--", &file])
}

#[tauri::command]
fn git_commit(cwd: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("commit message is empty".to_string());
    }
    run_git(&cwd, &["commit", "-m", message.trim()])
}

#[tauri::command]
fn git_push(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["push"])
}

#[tauri::command]
fn git_pull(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["pull"])
}

struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
}

#[derive(Default)]
struct PtyState(Mutex<HashMap<String, PtySession>>);

#[derive(Serialize, Clone)]
struct PtyOutput {
    id: String,
    data: String,
}

#[tauri::command]
fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    id: String,
    cwd: String,
    program: Option<String>,
    args: Option<Vec<String>>,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = program.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
    });
    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);
    if let Some(a) = &args {
        cmd.args(a);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let killer = child.clone_killer();
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    {
        let mut map = state.0.lock().unwrap();
        map.insert(id.clone(), PtySession {
            writer,
            master: pair.master,
            killer,
        });
    }

    let app_out = app.clone();
    let id_out = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut pending: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    pending.extend_from_slice(&buf[..n]);
                    match std::str::from_utf8(&pending) {
                        Ok(s) => {
                            let _ = app_out.emit(
                                "pty-output",
                                PtyOutput {
                                    id: id_out.clone(),
                                    data: s.to_string(),
                                },
                            );
                            pending.clear();
                        }
                        Err(e) => {
                            let valid = e.valid_up_to();
                            if valid > 0 {
                                let s = String::from_utf8_lossy(&pending[..valid]).to_string();
                                let _ = app_out.emit(
                                    "pty-output",
                                    PtyOutput {
                                        id: id_out.clone(),
                                        data: s,
                                    },
                                );
                                pending.drain(..valid);
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }
        let _ = app_out.emit("pty-exit", &id_out);
        let state = app_out.state::<PtyState>();
        let mut map = state.0.lock().unwrap();
        map.remove(&id_out);
    });

    std::thread::spawn(move || {
        let mut child = child;
        let _ = child.wait();
    });

    Ok(())
}

#[tauri::command]
fn pty_write(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(session) = map.get_mut(&id) {
        session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("no such pty session".to_string())
    }
}

#[tauri::command]
fn pty_resize(state: State<'_, PtyState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = state.0.lock().unwrap();
    if let Some(session) = map.get(&id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("no such pty session".to_string())
    }
}

#[tauri::command]
fn pty_kill(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(mut session) = map.remove(&id) {
        let _ = session.killer.kill();
        drop(session.master);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            home_dir,
            list_dir,
            read_file,
            write_file,
            git_is_repo,
            git_init,
            git_branch,
            git_status,
            git_stage,
            git_unstage,
            git_commit,
            git_push,
            git_pull,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
