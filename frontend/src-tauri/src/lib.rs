use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};

type HmacSha256 = Hmac<Sha256>;
static IS_GAME_ACTIVE: AtomicBool = AtomicBool::new(false);

// ── Comandos IPC ──────────────────────────────────────────────────────────────

/// Genera una firma HMAC-SHA256 de una cadena canónica, codificada en Base64.
///
/// El secreto nunca sale del proceso Rust — JS solo recibe la firma resultante.
#[tauri::command]
async fn sign_payload(payload_json: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};
    let secret = std::env::var("USBI_HMAC_SECRET")
        .map_err(|_| "USBI_HMAC_SECRET no está configurado".to_string())?;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| e.to_string())?;
    mac.update(payload_json.as_bytes());
    Ok(general_purpose::STANDARD.encode(mac.finalize().into_bytes()))
}

/// Elimina el archivo SQLite local.
///
/// Uso exclusivo para flujo ARCO/Logout: se llama cuando el servidor responde
/// `wipe_local_data: true` en SyncEventResponse. NO se llama en sync normal.
#[tauri::command]
async fn wipe_local_data(app: AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "No se pudo obtener el directorio de datos de la aplicación".to_string())?;
    let db_path = app_dir.join("usbi_local.db");

    if db_path.exists() {
        std::fs::remove_file(&db_path)
            .map_err(|e| format!("Error eliminando base de datos local: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn set_game_status(is_playing: bool) -> bool {
    IS_GAME_ACTIVE.store(is_playing, Ordering::SeqCst);
    IS_GAME_ACTIVE.load(Ordering::SeqCst)
}

#[tauri::command]
fn get_game_status() -> bool {
    IS_GAME_ACTIVE.load(Ordering::SeqCst)
}

// ── Worker de red ─────────────────────────────────────────────────────────────

/// Monitorea la conectividad con el backend en segundo plano.
///
/// Emite el evento `network-status` (bool) hacia el frontend cuando cambia el
/// estado. Solo emite en cambios para no saturar el canal IPC.
///
/// Configurable vía variable de entorno USBI_BACKEND_ADDR.
fn start_network_ping(app: AppHandle) {
    let (tx, mut rx) = mpsc::channel::<bool>(4);
    let backend_addr =
        std::env::var("USBI_BACKEND_ADDR").unwrap_or_else(|_| "127.0.0.1:8088".to_string());

    // Worker de ping — se ejecuta en tokio task
    tokio::spawn(async move {
        loop {
            let addr = backend_addr.clone();
            let is_online = tokio::time::timeout(Duration::from_secs(2), TcpStream::connect(addr))
                .await
                .map(|r| r.is_ok())
                .unwrap_or(false);

            // Si el receptor fue descartado, terminar el worker graciosamente
            if tx.send(is_online).await.is_err() {
                break;
            }
            sleep(Duration::from_secs(60)).await;
        }
    });

    // Worker de emisión de eventos — solo emite cuando el estado cambia
    tokio::spawn(async move {
        let mut last_status: Option<bool> = None;
        while let Some(is_online) = rx.recv().await {
            let changed = last_status.map(|s| s != is_online).unwrap_or(true);
            if changed {
                last_status = Some(is_online);
                let _ = app.emit("network-status", is_online);
            }
        }
    });
}

// ── Entry point de Tauri ──────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            start_network_ping(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sign_payload,
            wipe_local_data,
            set_game_status,
            get_game_status
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
