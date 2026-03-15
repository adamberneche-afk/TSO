use std::sync::Arc;
use std::path::PathBuf;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::{
    Router,
    routing::{get, post, delete},
    extract::{State, Path, Query},
    response::Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;
use rand::Rng;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

const CURRENT_VERSION: &str = "1.0.0";
const UPDATE_CHECK_URL: &str = "https://api.github.com/repos/adamberneche-afk/TSO/releases/latest";

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Database>>,
    data_dir: PathBuf,
    service_id: String,
    encryption_key: String,
}

#[derive(Default, Serialize, Deserialize)]
struct Database {
    breadcrumbs: Vec<Breadcrumb>,
    configs: Vec<AgentConfig>,
    events: Vec<KBEvent>,
    provisions: Vec<Provision>,
}

#[derive(Clone, Serialize, Deserialize)]
struct Breadcrumb {
    id: String,
    owner_id: String,
    content: String,
    context_type: String,
    source_app: Option<String>,
    embedding_hash: Option<String>,
    created_at: i64,
}

#[derive(Clone, Serialize, Deserialize)]
struct AgentConfig {
    id: String,
    owner_id: String,
    name: String,
    llm_provider: String,
    llm_model: String,
    system_prompt: String,
    created_at: i64,
}

#[derive(Clone, Serialize, Deserialize)]
struct KBEvent {
    id: String,
    kb_id: String,
    event_type: String,
    content: Option<String>,
    timestamp: i64,
}

#[derive(Clone, Serialize, Deserialize)]
struct Provision {
    agent_id: String,
    owner_id: String,
    token: String,
    refresh_token: String,
    created_at: i64,
    expires_at: i64,
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

fn get_data_dir() -> PathBuf {
    let dir = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map(|p| PathBuf::from(p).join("RCRT"))
            .unwrap_or_else(|_| PathBuf::from("."))
    } else {
        std::env::var("HOME")
            .map(|p| PathBuf::from(p).join(".rcrt"))
            .unwrap_or_else(|_| PathBuf::from("."))
    };
    fs::create_dir_all(&dir).ok();
    dir
}

fn load_db(data_dir: &PathBuf) -> Database {
    let db_path = data_dir.join("db.json");
    if db_path.exists() {
        if let Ok(data) = fs::read_to_string(&db_path) {
            if let Ok(db) = serde_json::from_str(&data) {
                return db;
            }
        }
    }
    Database::default()
}

fn save_db(data_dir: &PathBuf, db: &Database) {
    let db_path = data_dir.join("db.json");
    if let Ok(data) = serde_json::to_string_pretty(db) {
        fs::write(db_path, data).ok();
    }
}

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    BASE64.encode(&bytes)
}

#[derive(Deserialize)]
struct ProvisionRequest {
    owner_id: Option<String>,
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    let db = state.db.lock().await;
    Json(serde_json::json!({
        "status": "running",
        "service_id": state.service_id,
        "version": "1.0.0",
        "breadcrumbs_count": db.breadcrumbs.len(),
        "timestamp": now()
    }))
}

async fn provision(
    State(state): State<AppState>,
    Json(req): Json<ProvisionRequest>,
) -> Json<serde_json::Value> {
    let mut db = state.db.lock().await;
    
    let owner_id = req.owner_id.unwrap_or_else(|| "default".to_string());
    let agent_id = format!("rcrt-{}", Uuid::new_v4());
    let token = generate_token();
    let refresh_token = generate_token();
    let created_at = now();
    let expires_at = created_at + 900; // 15 minutes
    
    let provision = Provision {
        agent_id: agent_id.clone(),
        owner_id: owner_id.clone(),
        token: token.clone(),
        refresh_token: refresh_token.clone(),
        created_at,
        expires_at,
    };
    
    db.provisions.push(provision);
    save_db(&state.data_dir, &db);
    
    Json(serde_json::json!({
        "agentId": agent_id,
        "ownerId": owner_id,
        "token": token,
        "refreshToken": refresh_token,
        "expiresIn": 900,
        "endpoints": {
            "breadcrumbs": "http://localhost:8090/api/breadcrumbs",
            "sync": "http://localhost:8090/api/sync",
            "health": "http://localhost:8090/health"
        }
    }))
}

async fn refresh(
    State(state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let refresh_token = req.get("refreshToken")
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;
    
    let mut db = state.db.lock().await;
    
    let provision = db.provisions.iter_mut()
        .find(|p| p.refresh_token == refresh_token && p.expires_at > now())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    let new_token = generate_token();
    let new_refresh_token = generate_token();
    let created_at = now();
    let expires_at = created_at + 900;
    
    provision.token = new_token.clone();
    provision.refresh_token = new_refresh_token.clone();
    provision.expires_at = expires_at;
    
    save_db(&state.data_dir, &db);
    
    Ok(Json(serde_json::json!({
        "token": new_token,
        "refreshToken": new_refresh_token,
        "expiresIn": 900
    })))
}

#[derive(Deserialize)]
struct BreadcrumbQuery {
    owner_id: Option<String>,
    limit: Option<usize>,
}

async fn get_breadcrumbs(
    State(state): State<AppState>,
    Query(query): Query<BreadcrumbQuery>,
) -> Json<serde_json::Value> {
    let db = state.db.lock().await;
    
    let mut breadcrumbs: Vec<_> = db.breadcrumbs.iter()
        .filter(|b| query.owner_id.as_ref().map_or(true, |o| &b.owner_id == o))
        .take(query.limit.unwrap_or(100))
        .map(|b| serde_json::json!({
            "id": b.id,
            "ownerId": b.owner_id,
            "content": b.content,
            "contextType": b.context_type,
            "sourceApp": b.source_app,
            "createdAt": b.created_at
        }))
        .collect();
    
    Json(serde_json::json!({ "breadcrumbs": breadcrumbs }))
}

#[derive(Deserialize)]
struct CreateBreadcrumb {
    owner_id: Option<String>,
    content: String,
    context_type: Option<String>,
    source_app: Option<String>,
}

async fn create_breadcrumb(
    State(state): State<AppState>,
    Json(req): Json<CreateBreadcrumb>,
) -> Json<serde_json::Value> {
    let mut db = state.db.lock().await;
    
    let breadcrumb = Breadcrumb {
        id: Uuid::new_v4().to_string(),
        owner_id: req.owner_id.unwrap_or_else(|| "default".to_string()),
        content: req.content,
        context_type: req.context_type.unwrap_or_else(|| "public".to_string()),
        source_app: req.source_app,
        embedding_hash: None,
        created_at: now(),
    };
    
    db.breadcrumbs.push(breadcrumb.clone());
    save_db(&state.data_dir, &db);
    
    Json(serde_json::json!({
        "id": breadcrumb.id,
        "createdAt": breadcrumb.created_at
    }))
}

async fn delete_breadcrumb(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> StatusCode {
    let mut db = state.db.lock().await;
    
    let initial_len = db.breadcrumbs.len();
    db.breadcrumbs.retain(|b| b.id != id);
    
    if db.breadcrumbs.len() < initial_len {
        save_db(&state.data_dir, &db);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

#[derive(Deserialize)]
struct SyncRequest {
    kb_id: Option<String>,
    context_type: Option<String>,
    content: Option<String>,
}

async fn sync(
    State(state): State<AppState>,
    Json(req): Json<SyncRequest>,
) -> Json<serde_json::Value> {
    let mut db = state.db.lock().await;
    
    let event = KBEvent {
        id: Uuid::new_v4().to_string(),
        kb_id: req.kb_id.unwrap_or_else(|| "default".to_string()),
        event_type: "sync".to_string(),
        content: req.content,
        timestamp: now(),
    };
    
    db.events.push(event);
    save_db(&state.data_dir, &db);
    
    Json(serde_json::json!({
        "synced": true,
        "timestamp": now()
    }))
}

async fn status(State(state): State<AppState>) -> Json<serde_json::Value> {
    let db = state.db.lock().await;
    
    Json(serde_json::json!({
        "serviceId": state.service_id,
        "version": CURRENT_VERSION,
        "status": "running",
        "encryption": "enabled",
        "dataDir": state.data_dir.to_string_lossy(),
        "stats": {
            "breadcrumbs": db.breadcrumbs.len(),
            "configs": db.configs.len(),
            "events": db.events.len()
        }
    }))
}

async fn version(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "currentVersion": CURRENT_VERSION,
        "updateAvailable": false,
        "downloadUrl": "https://github.com/adamberneche-afk/TSO/releases",
        "releaseNotes": "Visit GitHub releases for update information"
    }))
}

#[tokio::main]
async fn main() {
    println!();
    println!("╔════════════════════════════════════════════════════════════╗");
    println!("║          RCRT - Right Context, Right Time               ║");
    println!("║          Standalone Service v{}                          ║", CURRENT_VERSION);
    println!("╚════════════════════════════════════════════════════════════╝");
    println!();
    
    let data_dir = get_data_dir();
    println!("📁 Data directory: {:?}", data_dir);
    
    let service_id = format!("rcrt-{}", Uuid::new_v4());
    println!("🆔 Service ID: {}", service_id);
    
    let db = load_db(&data_dir);
    println!("📊 Loaded {} breadcrumbs from storage", db.breadcrumbs.len());
    
    let state = AppState {
        db: Arc::new(Mutex::new(db)),
        data_dir: data_dir.clone(),
        service_id: service_id.clone(),
        encryption_key: generate_token(),
    };
    
    // Periodically save database
    let save_state = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
            let db = save_state.db.lock().await;
            save_db(&save_state.data_dir, &db);
        }
    });
    
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/provision", post(provision))
        .route("/api/v1/refresh", post(refresh))
        .route("/api/v1/breadcrumbs", get(get_breadcrumbs).post(create_breadcrumb))
        .route("/api/v1/breadcrumbs/:id", delete(delete_breadcrumb))
        .route("/api/v1/sync", post(sync))
        .route("/api/v1/status", get(status))
        .route("/api/v1/version", get(version))
        .with_state(state);
    
    let addr = "127.0.0.1:8090";
    println!("🌐 Starting HTTP server at http://{}", addr);
    println!();
    println!("✅ RCRT is running!");
    println!();
    println!("Endpoints:");
    println!("  - Health:  http://{}/health", addr);
    println!("  - Status:  http://{}/api/v1/status", addr);
    println!("  - Provision: POST http://{}/api/v1/provision", addr);
    println!("  - Breadcrumbs: GET/POST http://{}/api/v1/breadcrumbs", addr);
    println!("  - Sync: POST http://{}/api/v1/sync", addr);
    println!();
    println!("Press Ctrl+C to stop");
    println!();
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
