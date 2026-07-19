use hmac::{Hmac, Mac};
use sha2::Sha256;
use tauri::{AppHandle, Emitter, Manager};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};

type HmacSha256 = Hmac<Sha256>;

// ── Comandos IPC ──────────────────────────────────────────────────────────────

/// Genera una firma HMAC-SHA256 del body JSON, codificada en Base64 estándar.
///
/// El body se pasa con hmac_signature="" (placeholder) tal como lo enviará
/// el cliente al servidor, garantizando byte-for-byte fidelidad (patrón JWS).
/// El secreto nunca sale del proceso Rust — JS solo recibe la firma resultante.
#[tauri::command]
async fn sign_payload(secret: String, payload_json: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| e.to_string())?;
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
        std::fs::remove_file(&db_path).map_err(|e| {
            format!("Error eliminando base de datos local: {}", e)
        })?;
    }
    Ok(())
}

// ── Worker de red ─────────────────────────────────────────────────────────────

/// Monitorea la conectividad con el backend LAN en segundo plano.
///
/// Emite el evento `network-status` (bool) hacia el frontend cuando cambia el
/// estado. Solo emite en cambios para no saturar el canal IPC.
///
/// Puerto: usa el puerto externo del contenedor Docker (8088 en LAN),
/// no el puerto interno (8080). Configurable vía variable de entorno
/// USBI_BACKEND_ADDR en futuras versiones.
fn start_network_ping(app: AppHandle) {
    let (tx, mut rx) = mpsc::channel::<bool>(4);

    // Worker de ping — se ejecuta en tokio task
    tokio::spawn(async move {
        loop {
            let is_online = tokio::time::timeout(
                Duration::from_secs(2),
                TcpStream::connect("192.168.1.210:8088"), // Puerto externo Docker
            )
            .await
            .map(|r| r.is_ok())
            .unwrap_or(false);

            // Si el receptor fue descartado, terminar el worker graciosamente
            if tx.send(is_online).await.is_err() {
                break;
            }
            sleep(Duration::from_secs(5)).await;
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
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            start_network_ping(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sign_payload,
            wipe_local_data
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
