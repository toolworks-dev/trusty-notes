#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod types;
mod crypto;
mod sync;

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager, Emitter};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use crate::types::{Note, SyncSettings};
use crate::sync::SyncManager;
use rand::RngCore;
use std::path::PathBuf;

#[tauri::command]
async fn generate_seed_phrase() -> Result<String, String> {
    let mut entropy = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut entropy);
    
    let mnemonic = bip39::Mnemonic::from_entropy(&entropy)
        .map_err(|e| e.to_string())?;
    
    Ok(mnemonic.to_string())
}

fn get_settings_path(app_handle: &AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .unwrap()
        .join("sync_settings.json")
}

#[tauri::command]
async fn get_sync_settings(app_handle: AppHandle) -> Result<SyncSettings, String> {
    let settings_path = get_settings_path(&app_handle);
    println!("Loading settings from: {:?}", settings_path);

    if settings_path.exists() {
        let settings_str = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        
        let settings: SyncSettings = serde_json::from_str(&settings_str)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;
        
        println!("Settings loaded successfully");
        Ok(settings)
    } else {
        println!("No settings file found, using defaults");
        Ok(SyncSettings::default())
    }
}

#[tauri::command]
async fn save_sync_settings(app_handle: AppHandle, settings: SyncSettings) -> Result<(), String> {
    let settings_path = get_settings_path(&app_handle);
    
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    
    println!("Saving settings to: {:?}", settings_path);
    
    let settings_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(settings_path, settings_str)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;
    
    println!("Settings saved successfully");
    Ok(())
}

fn initialize_database(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app local data directory");
    
    fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    
    let db_path = app_dir.join("notes.db");
    println!("Database path: {:?}", db_path); // Add this logging
    
    let conn = Connection::open(db_path)?;

    // Create the notes table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}

#[tauri::command]
async fn save_note(app_handle: AppHandle, note: Note) -> Result<(), String> {
    println!("Saving note: {:?}", note);
    
    let conn = initialize_database(&app_handle)
        .map_err(|e| {
            println!("Database initialization error: {}", e);
            e.to_string()
        })?;
    
    let result: Result<(), String> = (|| {
        // For new notes (no ID)
        if note.id.is_none() {
            println!("Inserting new note");
            let result = conn.execute(
                "INSERT INTO notes (title, content, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4)",
                (
                    &note.title,
                    &note.content,
                    &note.created_at,
                    &note.updated_at,
                ),
            );
            
            match &result {
                Ok(rows) => println!("Inserted {} rows", rows),
                Err(ref e) => println!("Insert error: {}", e),
            }
            
            result.map_err(|e| e.to_string())?;
        } else {
            // For existing notes
            println!("Updating existing note");
            let result = conn.execute(
                "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
                (
                    &note.title,
                    &note.content,
                    &note.updated_at,
                    note.id.unwrap()
                ),
            );
            
            match &result {
                Ok(rows) => println!("Updated {} rows", rows),
                Err(ref e) => println!("Update error: {}", e),
            }
            
            result.map_err(|e| e.to_string())?;
        }
        
        Ok(())
    })();

    match result {
        Ok(_) => {
            println!("Note saved successfully");
            Ok(())
        }
        Err(e) => {
            println!("Error saving note: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
async fn get_notes(app_handle: AppHandle) -> Result<Vec<Note>, String> {
    let conn = initialize_database(&app_handle)
        .map_err(|e| e.to_string())?;
    
    println!("Fetching notes"); // Add logging
    
    let mut stmt = conn.prepare(
        "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let notes: Vec<Note> = stmt.query_map([], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    println!("Found {} notes", notes.len()); // Add logging
    Ok(notes)
}

#[tauri::command]
async fn get_notes_json(app_handle: AppHandle) -> Result<String, String> {
    let notes = get_notes(app_handle).await?;
    serde_json::to_string(&notes).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_note(app_handle: AppHandle, note_id: i64) -> Result<(), String> {
    let conn = initialize_database(&app_handle).map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM notes WHERE id = ?",
        [note_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn export_notes(app_handle: AppHandle) -> Result<String, String> {
    let conn = initialize_database(&app_handle).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, title, content, created_at, updated_at FROM notes"
    ).map_err(|e| e.to_string())?;
    
    let notes: Vec<Note> = stmt.query_map([], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    serde_json::to_string(&notes).map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_notes(app_handle: AppHandle, notes_json: String) -> Result<(), String> {
    let conn = initialize_database(&app_handle).map_err(|e| e.to_string())?;
    let notes: Vec<Note> = serde_json::from_str(&notes_json).map_err(|e| e.to_string())?;
    
    for note in notes {
        conn.execute(
            "INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
            [&note.title, &note.content, &note.created_at.to_string(), &note.updated_at.to_string()],
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
async fn initialize_sync(seed_phrase: String, server_url: String) -> Result<(), String> {
    SyncManager::new(&seed_phrase, &server_url)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn sync_notes(
    app_handle: AppHandle,
    seed_phrase: String,
    server_url: String,
) -> Result<(), String> {
    let sync_manager = SyncManager::new(&seed_phrase, &server_url)
        .map_err(|e| e.to_string())?;
    
    let local_notes = get_notes(app_handle.clone()).await?;
    println!("Syncing {} local notes", local_notes.len());
    
    let progress_handle = app_handle.clone();
    
    let synced_notes = sync_manager.sync_with_progress(
        local_notes,
        move |progress| {
            println!("Sync progress: {:?}", progress);
            let _ = progress_handle.emit("sync:progress", progress);
        },
    )
    .await
    .map_err(|e| e.to_string())?;
    
    println!("Received {} synced notes", synced_notes.len());
    
    // Create a new connection for the transaction
    let conn = initialize_database(&app_handle)
        .map_err(|e| e.to_string())?;
    
    // Execute all database operations synchronously
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;
    
    let result: Result<(), String> = (|| {
        // Delete all local notes first
        conn.execute("DELETE FROM notes", [])
            .map_err(|e| e.to_string())?;
        
        // Then save all synced notes
        for note in &synced_notes {
            if let Some(id) = note.id {
                conn.execute(
                    "INSERT INTO notes (id, title, content, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?)",
                    [
                        &id.to_string(),
                        &note.title,
                        &note.content,
                        &note.created_at.to_string(),
                        &note.updated_at.to_string()
                    ],
                ).map_err(|e| e.to_string())?;
            }
        }
        
        Ok(())
    })();

    match result {
        Ok(_) => {
            conn.execute("COMMIT", [])
                .map_err(|e| e.to_string())?;
            println!("Sync completed successfully");
            Ok(())
        }
        Err(e) => {
            conn.execute("ROLLBACK", [])
                .map_err(|e| format!("Rollback failed: {}", e))?;
            Err(format!("Sync failed: {}", e))
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            let tray = TrayIconBuilder::new()
            .menu(&menu)
            .icon(app.default_window_icon().unwrap().clone())
            .tooltip("Rusty Notes")
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "quit" => {
                    app.exit(0);
                }
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                        
                        #[cfg(target_os = "linux")]
                        {
                            window.set_always_on_top(true).unwrap();
                            window.set_always_on_top(false).unwrap();
                        }
                    }
                }
                "hide" => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.hide().unwrap();
                    }
                }
                _ => {}
            })
            .build(app)?;
        
        #[cfg(target_os = "linux")]
        {
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            tray.on_tray_icon_event(move |event| {
                if let tauri::tray::TrayIconEvent::LeftClick { .. } = event {
                    if window_clone.is_visible().unwrap() {
                        window_clone.hide().unwrap();
                    } else {
                        window_clone.show().unwrap();
                        window_clone.set_focus().unwrap();
                        // Bring to front
                        window_clone.set_always_on_top(true).unwrap();
                        window_clone.set_always_on_top(false).unwrap();
                    }
                }
            });
        }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_note,
            get_notes,
            get_notes_json,
            delete_note,
            export_notes,
            import_notes,
            get_sync_settings,
            save_sync_settings,
            initialize_sync,
            sync_notes,
            generate_seed_phrase
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}